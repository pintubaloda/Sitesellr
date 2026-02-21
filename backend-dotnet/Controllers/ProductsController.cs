using backend_dotnet.Data;
using backend_dotnet.Models;
using backend_dotnet.Services;
using backend_dotnet.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Concurrent;
using System.Text;

namespace backend_dotnet.Controllers;

public class ProductsController : BaseApiController
{
    private static readonly ConcurrentDictionary<Guid, ProductImportJobStatus> ImportJobs = new();
    private readonly AppDbContext _db;
    private readonly ISubscriptionCapabilityService _caps;
    private readonly IMediaAssetService _mediaAssets;
    private readonly ILogger<ProductsController> _logger;

    public ProductsController(AppDbContext db, ISubscriptionCapabilityService caps, IMediaAssetService mediaAssets, ILogger<ProductsController> logger)
    {
        _db = db;
        _caps = caps;
        _mediaAssets = mediaAssets;
        _logger = logger;
    }

    [HttpGet]
    [Authorize(Policy = Policies.ProductsRead)]
    public async Task<IActionResult> List([FromQuery] Guid storeId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
    {
        if (storeId == Guid.Empty) return BadRequest(new { error = "store_required" });
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var products = await _db.Products
            .AsNoTracking()
            .Where(p => p.StoreId == storeId)
            .Include(p => p.Variants)
            .Include(p => p.Media)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
        return Ok(products.Select(ToResponse));
    }

    [HttpPost]
    [Authorize(Policy = Policies.ProductsWrite)]
    public async Task<IActionResult> Create([FromBody] ProductUpsertRequest input, CancellationToken ct)
    {
        try
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            if (input.StoreId == Guid.Empty) return BadRequest(new { error = "store_required" });
            if (Tenancy?.Store != null && Tenancy.Store.Id != input.StoreId) return Forbid();
            var check = await _caps.CheckProductsCreateAsync(input.StoreId, input.Variants?.Count ?? 0, ct);
            if (!check.Allowed) return StatusCode(StatusCodes.Status403Forbidden, new { error = check.Error, details = check.Details });

            IReadOnlyList<ProductMedia> normalizedMedia = Array.Empty<ProductMedia>();
            if (input.Media?.Count > 0)
            {
                var mediaInput = input.Media.Select(m => new ProductMedia
                {
                    Id = m.Id,
                    Url = m.Url,
                    SortOrder = m.SortOrder
                });
                normalizedMedia = await NormalizeProductMediaAsync(input.StoreId, mediaInput, ct);
            }

            var created = new Product
            {
                Id = Guid.NewGuid(),
                StoreId = input.StoreId,
                Title = input.Title,
                Description = input.Description,
                SKU = input.SKU,
                Price = input.Price,
                CompareAtPrice = input.CompareAtPrice,
                Currency = string.IsNullOrWhiteSpace(input.Currency) ? "INR" : input.Currency,
                Status = input.Status,
                IsPublished = input.IsPublished,
                CategoryId = input.CategoryId,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
                Variants = input.Variants.Select(v => new ProductVariant
                {
                    Id = v.Id == Guid.Empty ? Guid.NewGuid() : v.Id,
                    SKU = v.SKU,
                    Price = v.Price,
                    Quantity = v.Quantity,
                    AttributesJson = v.AttributesJson,
                    IsDefault = v.IsDefault
                }).ToList(),
                Media = normalizedMedia.Select(m => new ProductMedia
                {
                    Id = m.Id == Guid.Empty ? Guid.NewGuid() : m.Id,
                    Url = m.Url,
                    SortOrder = m.SortOrder
                }).ToList()
            };

            _db.Products.Add(created);
            await _db.SaveChangesAsync(ct);
            return CreatedAtAction(nameof(Get), new { id = created.Id, storeId = created.StoreId }, ToResponse(created));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Create product failed for store {StoreId}", input.StoreId);
            return StatusCode(500, new { error = "product_create_failed", detail = ex.Message });
        }
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = Policies.ProductsRead)]
    public async Task<IActionResult> Get(Guid id, [FromQuery] Guid storeId, CancellationToken ct)
    {
        if (storeId == Guid.Empty) return BadRequest(new { error = "store_required" });
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var product = await _db.Products
            .Include(p => p.Variants)
            .Include(p => p.Media)
            .FirstOrDefaultAsync(p => p.Id == id && p.StoreId == storeId, ct);
        return product == null ? NotFound() : Ok(ToResponse(product));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Policies.ProductsWrite)]
    public async Task<IActionResult> Update(Guid id, [FromBody] ProductUpsertRequest input, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        if (input.StoreId == Guid.Empty) return BadRequest(new { error = "store_required" });
        if (Tenancy?.Store != null && Tenancy.Store.Id != input.StoreId) return Forbid();
        if (id != input.Id && input.Id != Guid.Empty) return BadRequest(new { error = "id_mismatch" });

        var product = await _db.Products
            .Include(p => p.Variants)
            .Include(p => p.Media)
            .FirstOrDefaultAsync(p => p.Id == id && p.StoreId == input.StoreId, ct);
        if (product == null) return NotFound();

        product.Title = input.Title;
        product.Description = input.Description;
        product.SKU = input.SKU;
        product.Price = input.Price;
        product.CompareAtPrice = input.CompareAtPrice;
        product.Currency = input.Currency;
        product.Status = input.Status;
        product.IsPublished = input.IsPublished;
        product.CategoryId = input.CategoryId;
        product.UpdatedAt = DateTimeOffset.UtcNow;
        var caps = await _caps.GetCapabilitiesAsync(input.StoreId, ct);
        if (caps.MaxVariantsPerProduct > 0 && (input.Variants?.Count ?? 0) > caps.MaxVariantsPerProduct)
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                error = "plan_limit_exceeded",
                details = new { action = "products.variants", limit = caps.MaxVariantsPerProduct, current = input.Variants?.Count ?? 0 }
            });

        if (input.Variants?.Count > 0)
        {
            _db.ProductVariants.RemoveRange(product.Variants);
            product.Variants = input.Variants.Select(v => new ProductVariant
            {
                Id = v.Id == Guid.Empty ? Guid.NewGuid() : v.Id,
                ProductId = product.Id,
                SKU = v.SKU,
                Price = v.Price,
                Quantity = v.Quantity,
                AttributesJson = v.AttributesJson,
                IsDefault = v.IsDefault
            }).ToList();
        }

        if (input.Media?.Count > 0)
        {
            _db.ProductMedia.RemoveRange(product.Media);
            IReadOnlyList<ProductMedia> normalizedMedia;
            try
            {
                var mediaInput = input.Media.Select(m => new ProductMedia
                {
                    Id = m.Id,
                    Url = m.Url,
                    SortOrder = m.SortOrder
                });
                normalizedMedia = await NormalizeProductMediaAsync(input.StoreId, mediaInput, ct);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            product.Media = normalizedMedia.Select(m => new ProductMedia
            {
                Id = m.Id == Guid.Empty ? Guid.NewGuid() : m.Id,
                ProductId = product.Id,
                Url = m.Url,
                SortOrder = m.SortOrder
            }).ToList();
        }

        await _db.SaveChangesAsync(ct);
        return Ok(ToResponse(product));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Policies.ProductsWrite)]
    public async Task<IActionResult> Delete(Guid id, [FromQuery] Guid storeId, CancellationToken ct)
    {
        if (storeId == Guid.Empty) return BadRequest(new { error = "store_required" });
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();

        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == id && p.StoreId == storeId, ct);
        if (product == null) return NotFound();

        _db.Products.Remove(product);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("import/csv")]
    [Authorize(Policy = Policies.ProductsWrite)]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> ImportCsv([FromQuery] Guid storeId, [FromForm] IFormFile file, CancellationToken ct)
    {
        if (storeId == Guid.Empty) return BadRequest(new { error = "store_required" });
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        if (file == null || file.Length == 0) return BadRequest(new { error = "file_required" });
        var jobId = Guid.NewGuid();
        var job = new ProductImportJobStatus { JobId = jobId, StoreId = storeId, Status = "processing", StartedAt = DateTimeOffset.UtcNow };
        ImportJobs[jobId] = job;
        byte[] payload;
        await using (var input = file.OpenReadStream())
        await using (var ms = new MemoryStream())
        {
            await input.CopyToAsync(ms, ct);
            payload = ms.ToArray();
        }

        _ = Task.Run(async () =>
        {
            try
            {
                using var stream = new MemoryStream(payload);
                using var reader = new StreamReader(stream, Encoding.UTF8);
                var all = await reader.ReadToEndAsync(ct);
                var lines = all.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                if (lines.Length < 2)
                {
                    job.Status = "failed";
                    job.Errors.Add(new ProductImportError { Row = 0, Error = "No data rows in csv." });
                    job.CompletedAt = DateTimeOffset.UtcNow;
                    return;
                }
                var caps = await _caps.GetCapabilitiesAsync(storeId, ct);
                var currentProducts = await _db.Products.CountAsync(x => x.StoreId == storeId, ct);
                for (var i = 1; i < lines.Length; i++)
                {
                    var cols = lines[i].Split(',');
                    if (cols.Length < 4)
                    {
                        job.Errors.Add(new ProductImportError { Row = i + 1, Error = "Expected columns: title,description,sku,price" });
                        continue;
                    }
                    if (caps.MaxProducts > 0 && currentProducts + job.SuccessCount >= caps.MaxProducts)
                    {
                        job.Errors.Add(new ProductImportError { Row = i + 1, Error = "Plan product limit reached." });
                        continue;
                    }
                    if (!decimal.TryParse(cols[3].Trim(), out var price))
                    {
                        job.Errors.Add(new ProductImportError { Row = i + 1, Error = "Invalid price." });
                        continue;
                    }
                    var row = new Product
                    {
                        Id = Guid.NewGuid(),
                        StoreId = storeId,
                        Title = cols[0].Trim(),
                        Description = cols[1].Trim(),
                        SKU = cols[2].Trim(),
                        Price = price,
                        Currency = "INR",
                        Status = ProductStatus.Draft,
                        IsPublished = false,
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow
                    };
                    _db.Products.Add(row);
                    job.SuccessCount++;
                }
                await _db.SaveChangesAsync(ct);
                job.Status = job.Errors.Count == 0 ? "completed" : (job.SuccessCount > 0 ? "partial" : "failed");
                job.CompletedAt = DateTimeOffset.UtcNow;
            }
            catch (Exception ex)
            {
                job.Status = "failed";
                job.Errors.Add(new ProductImportError { Row = 0, Error = ex.Message });
                job.CompletedAt = DateTimeOffset.UtcNow;
            }
        }, ct);

        return Ok(new { jobId, status = "processing" });
    }

    [HttpGet("import/jobs/{jobId:guid}")]
    [Authorize(Policy = Policies.ProductsRead)]
    public IActionResult ImportJob(Guid jobId)
    {
        if (!ImportJobs.TryGetValue(jobId, out var job)) return NotFound(new { error = "job_not_found" });
        return Ok(job);
    }

    [HttpPost("media/upload")]
    [Authorize(Policy = Policies.ProductsWrite)]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> UploadMedia([FromQuery] Guid storeId, [FromForm] IFormFile file, [FromForm] string? kind, CancellationToken ct)
    {
        if (storeId == Guid.Empty) return BadRequest(new { error = "store_required" });
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        if (file == null || file.Length == 0) return BadRequest(new { error = "file_required" });
        if (file.Length > 10_000_000) return BadRequest(new { error = "file_too_large" });
        MediaAssetSaveResult asset;
        try
        {
            asset = await _mediaAssets.SaveUploadedAsync(storeId, file, string.IsNullOrWhiteSpace(kind) ? "product-image" : kind, Request, ct);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        var row = new StoreMediaAsset
        {
            StoreId = storeId,
            FileName = asset.FileName,
            ContentType = asset.ContentType,
            SizeBytes = asset.SizeBytes,
            Url = asset.Url,
            Kind = asset.Kind,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.StoreMediaAssets.Add(row);
        await _db.SaveChangesAsync(ct);
        return Ok(row);
    }

    [HttpPost("media/fetch-url")]
    [Authorize(Policy = Policies.ProductsWrite)]
    public async Task<IActionResult> FetchMediaFromUrl([FromQuery] Guid storeId, [FromBody] ProductMediaFetchRequest req, CancellationToken ct)
    {
        if (storeId == Guid.Empty) return BadRequest(new { error = "store_required" });
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        if (string.IsNullOrWhiteSpace(req.Url)) return BadRequest(new { error = "url_required" });
        MediaAssetSaveResult asset;
        try
        {
            asset = await _mediaAssets.FetchAndSaveImageAsync(storeId, req.Url.Trim(), string.IsNullOrWhiteSpace(req.Kind) ? "product-image" : req.Kind.Trim(), Request, ct);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        var row = new StoreMediaAsset
        {
            StoreId = storeId,
            FileName = asset.FileName,
            ContentType = asset.ContentType,
            SizeBytes = asset.SizeBytes,
            Url = asset.Url,
            Kind = asset.Kind,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.StoreMediaAssets.Add(row);
        await _db.SaveChangesAsync(ct);
        return Ok(row);
    }

    private async Task<IReadOnlyList<ProductMedia>> NormalizeProductMediaAsync(Guid storeId, IEnumerable<ProductMedia> media, CancellationToken ct)
    {
        var result = new List<ProductMedia>();
        var index = 0;
        foreach (var item in media.OrderBy(x => x.SortOrder))
        {
            var url = (item.Url ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(url)) continue;
            if (url.Contains("/uploads/", StringComparison.OrdinalIgnoreCase))
            {
                result.Add(new ProductMedia
                {
                    Id = item.Id,
                    ProductId = item.ProductId,
                    Url = url,
                    SortOrder = index++
                });
                continue;
            }

            if (url.EndsWith(".mp4", StringComparison.OrdinalIgnoreCase) ||
                url.EndsWith(".webm", StringComparison.OrdinalIgnoreCase) ||
                url.EndsWith(".mov", StringComparison.OrdinalIgnoreCase) ||
                url.Contains("youtube.com", StringComparison.OrdinalIgnoreCase) ||
                url.Contains("youtu.be", StringComparison.OrdinalIgnoreCase) ||
                url.Contains("vimeo.com", StringComparison.OrdinalIgnoreCase))
            {
                result.Add(new ProductMedia
                {
                    Id = item.Id,
                    ProductId = item.ProductId,
                    Url = url,
                    SortOrder = index++
                });
                continue;
            }

            MediaAssetSaveResult? normalized = null;
            try
            {
                normalized = await _mediaAssets.FetchAndSaveImageAsync(storeId, url, "product-image", Request, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Image normalization skipped for store {StoreId}: {Url}", storeId, url);
            }
            result.Add(new ProductMedia
            {
                Id = item.Id,
                ProductId = item.ProductId,
                Url = normalized?.Url ?? url,
                SortOrder = index++
            });
        }
        return result;
    }

    private static ProductResponse ToResponse(Product p)
    {
        return new ProductResponse
        {
            Id = p.Id,
            StoreId = p.StoreId,
            Title = p.Title,
            Description = p.Description,
            SKU = p.SKU,
            Price = p.Price,
            CompareAtPrice = p.CompareAtPrice,
            Currency = p.Currency,
            Status = p.Status,
            IsPublished = p.IsPublished,
            CategoryId = p.CategoryId,
            CreatedAt = p.CreatedAt,
            UpdatedAt = p.UpdatedAt,
            Variants = (p.Variants ?? Array.Empty<ProductVariant>()).Select(v => new ProductVariantResponse
            {
                Id = v.Id,
                ProductId = v.ProductId,
                SKU = v.SKU,
                Price = v.Price,
                Quantity = v.Quantity,
                ReservedQuantity = v.ReservedQuantity,
                AttributesJson = v.AttributesJson,
                IsDefault = v.IsDefault
            }).ToList(),
            Media = (p.Media ?? Array.Empty<ProductMedia>()).Select(m => new ProductMediaResponse
            {
                Id = m.Id,
                ProductId = m.ProductId,
                Url = m.Url,
                SortOrder = m.SortOrder
            }).ToList()
        };
    }
}

public class ProductImportJobStatus
{
    public Guid JobId { get; set; }
    public Guid StoreId { get; set; }
    public string Status { get; set; } = "processing";
    public int SuccessCount { get; set; }
    public List<ProductImportError> Errors { get; set; } = new();
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
}

public class ProductImportError
{
    public int Row { get; set; }
    public string Error { get; set; } = string.Empty;
}

public class ProductMediaFetchRequest
{
    public string Url { get; set; } = string.Empty;
    public string? Kind { get; set; }
}

public class ProductUpsertRequest
{
    public Guid Id { get; set; }
    public Guid StoreId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? SKU { get; set; }
    public decimal Price { get; set; }
    public decimal? CompareAtPrice { get; set; }
    public string Currency { get; set; } = "INR";
    public ProductStatus Status { get; set; } = ProductStatus.Draft;
    public bool IsPublished { get; set; }
    public Guid? CategoryId { get; set; }
    public List<ProductVariantUpsertRequest> Variants { get; set; } = new();
    public List<ProductMediaUpsertRequest> Media { get; set; } = new();
}

public class ProductVariantUpsertRequest
{
    public Guid Id { get; set; }
    public string? SKU { get; set; }
    public decimal Price { get; set; }
    public int Quantity { get; set; }
    public string? AttributesJson { get; set; }
    public bool IsDefault { get; set; }
}

public class ProductResponse
{
    public Guid Id { get; set; }
    public Guid StoreId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? SKU { get; set; }
    public decimal Price { get; set; }
    public decimal? CompareAtPrice { get; set; }
    public string Currency { get; set; } = "INR";
    public ProductStatus Status { get; set; }
    public bool IsPublished { get; set; }
    public Guid? CategoryId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public List<ProductVariantResponse> Variants { get; set; } = new();
    public List<ProductMediaResponse> Media { get; set; } = new();
}

public class ProductVariantResponse
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string? SKU { get; set; }
    public decimal Price { get; set; }
    public int Quantity { get; set; }
    public int ReservedQuantity { get; set; }
    public string? AttributesJson { get; set; }
    public bool IsDefault { get; set; }
}

public class ProductMediaResponse
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string Url { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public class ProductMediaUpsertRequest
{
    public Guid Id { get; set; }
    public string Url { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
