using backend_dotnet.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Nodes;
using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using System.Text;

namespace backend_dotnet.Controllers;

[ApiController]
[Route("api/public/storefront")]
public class PublicStorefrontController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly backend_dotnet.Services.IEmailService _emailService;

    public PublicStorefrontController(AppDbContext db, backend_dotnet.Services.IEmailService emailService)
    {
        _db = db;
        _emailService = emailService;
    }

    [HttpGet("{subdomain}")]
    public async Task<IActionResult> GetBySubdomain(string subdomain, [FromQuery] Guid? customerGroupId, [FromQuery] Guid? previewThemeId, CancellationToken ct)
    {
        var normalized = subdomain.Trim().ToLowerInvariant();
        var store = await _db.Stores.AsNoTracking().FirstOrDefaultAsync(x => x.Subdomain == normalized, ct);
        if (store == null) return NotFound(new { error = "store_not_found" });

        var theme = await _db.StoreThemeConfigs.AsNoTracking()
            .Include(x => x.ActiveTheme)
            .FirstOrDefaultAsync(x => x.StoreId == store.Id, ct);
        if (previewThemeId.HasValue)
        {
            var previewTheme = await _db.ThemeCatalogItems.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == previewThemeId.Value && x.IsActive, ct);
            if (previewTheme != null)
            {
                theme ??= new Models.StoreThemeConfig { StoreId = store.Id };
                theme.ActiveThemeId = previewTheme.Id;
                theme.ActiveTheme = previewTheme;
            }
        }
        var homepage = await _db.StoreHomepageLayouts.AsNoTracking().FirstOrDefaultAsync(x => x.StoreId == store.Id, ct);
        var nav = await _db.StoreNavigationMenus.AsNoTracking()
            .Where(x => x.StoreId == store.Id && x.IsPrimary)
            .OrderByDescending(x => x.UpdatedAt)
            .FirstOrDefaultAsync(ct);
        var rules = await _db.VisibilityRules.AsNoTracking()
            .Where(x => x.StoreId == store.Id && x.IsActive && (x.CustomerGroupId == null || x.CustomerGroupId == customerGroupId))
            .ToListAsync(ct);
        var productRules = rules.Where(x => x.TargetType == "product").ToList();
        var pageRules = rules.Where(x => x.TargetType == "page").ToList();
        var blockRules = rules.Where(x => x.TargetType == "theme_block").ToList();

        var pages = await _db.StoreStaticPages.AsNoTracking()
            .Where(x => x.StoreId == store.Id && x.IsPublished)
            .Select(x => new { x.Title, x.Slug, x.SeoTitle, x.SeoDescription })
            .ToListAsync(ct);
        pages = ApplyVisibility(pages, x => x.Slug.ToLowerInvariant(), pageRules).ToList();

        var products = await _db.Products.AsNoTracking()
            .Where(x => x.StoreId == store.Id)
            .OrderByDescending(x => x.CreatedAt)
            .Take(24)
            .Select(x => new
            {
                x.Id,
                x.Title,
                x.Description,
                x.CategoryId,
                Price = (theme == null || theme.ShowPricing) ? x.Price : (decimal?)null,
                x.Currency
            })
            .ToListAsync(ct);
        products = ApplyVisibility(products, x => x.Id.ToString().ToLowerInvariant(), productRules).ToList();
        var categories = await _db.Categories.AsNoTracking()
            .Where(x => x.StoreId == store.Id)
            .OrderBy(x => x.Name)
            .Select(x => new { x.Id, x.Name, x.Slug })
            .ToListAsync(ct);

        var filteredSectionsJson = FilterThemeBlocks(homepage?.SectionsJson ?? "[]", blockRules);

        return Ok(new
        {
            store = new { store.Id, store.Name, store.Subdomain, store.Currency, store.Timezone },
            theme = theme == null ? null : new
            {
                theme.ActiveThemeId,
                ActiveTheme = theme.ActiveTheme == null ? null : new
                {
                    theme.ActiveTheme.Name,
                    theme.ActiveTheme.Slug,
                    theme.ActiveTheme.Category,
                    theme.ActiveTheme.TypographyPack,
                    theme.ActiveTheme.LayoutVariant,
                    theme.ActiveTheme.RuntimePackageJson,
                    theme.ActiveTheme.TemplatesJson,
                    theme.ActiveTheme.SectionSchemasJson,
                    theme.ActiveTheme.HookPointsJson,
                    theme.ActiveTheme.ThemeVersion,
                    theme.ActiveTheme.PlpVariantsJson,
                    theme.ActiveTheme.PdpVariantsJson
                },
                theme.LogoUrl,
                theme.FaviconUrl,
                theme.HeaderJson,
                theme.FooterJson,
                theme.BannerJson,
                theme.DesignTokensJson,
                theme.ShowPricing,
                theme.LoginToViewPrice,
                theme.CatalogMode,
                theme.CatalogVisibilityJson,
                theme.QuoteAlertEmail
            },
            homepage = new { SectionsJson = filteredSectionsJson },
            navigation = new { ItemsJson = nav?.ItemsJson ?? "[]" },
            pages,
            products,
            categories,
            previewThemeId
        });
    }

    [HttpGet("{subdomain}/pages/{slug}")]
    public async Task<IActionResult> GetPage(string subdomain, string slug, CancellationToken ct)
    {
        var normalizedSubdomain = subdomain.Trim().ToLowerInvariant();
        var normalizedSlug = slug.Trim().ToLowerInvariant();
        var store = await _db.Stores.AsNoTracking().FirstOrDefaultAsync(x => x.Subdomain == normalizedSubdomain, ct);
        if (store == null) return NotFound(new { error = "store_not_found" });

        var page = await _db.StoreStaticPages.AsNoTracking()
            .FirstOrDefaultAsync(x => x.StoreId == store.Id && x.Slug == normalizedSlug && x.IsPublished, ct);
        if (page == null) return NotFound(new { error = "page_not_found" });

        return Ok(page);
    }

    [HttpPost("{subdomain}/customer-auth/register")]
    public async Task<IActionResult> CustomerRegister(string subdomain, [FromBody] CustomerRegisterRequest req, CancellationToken ct)
    {
        var normalizedSubdomain = subdomain.Trim().ToLowerInvariant();
        var store = await _db.Stores.AsNoTracking().FirstOrDefaultAsync(x => x.Subdomain == normalizedSubdomain, ct);
        if (store == null) return NotFound(new { error = "store_not_found" });

        var email = req.Email.Trim().ToLowerInvariant();
        var exists = await _db.StoreCustomerCredentials.AsNoTracking().AnyAsync(x => x.StoreId == store.Id && x.Email == email, ct);
        if (exists) return Conflict(new { error = "customer_exists" });

        var customer = await _db.Customers.FirstOrDefaultAsync(x => x.StoreId == store.Id && x.Email == email, ct);
        if (customer == null)
        {
            customer = new Models.Customer
            {
                StoreId = store.Id,
                Name = req.Name.Trim(),
                Email = email,
                Phone = req.Phone.Trim(),
                Type = Models.CustomerType.Retail,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            _db.Customers.Add(customer);
            await _db.SaveChangesAsync(ct);
        }

        _db.StoreCustomerCredentials.Add(new Models.StoreCustomerCredential
        {
            StoreId = store.Id,
            CustomerId = customer.Id,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password, workFactor: 12),
            EmailVerified = false,
            EmailVerificationCodeHash = HashToken("000000"),
            EmailVerificationExpiresAt = DateTimeOffset.UtcNow.AddMinutes(15),
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync(ct);
        return Ok(new { registered = true, emailOtp = "000000" });
    }

    [HttpPost("{subdomain}/customer-auth/login")]
    public async Task<IActionResult> CustomerLogin(string subdomain, [FromBody] CustomerLoginRequest req, CancellationToken ct)
    {
        var normalizedSubdomain = subdomain.Trim().ToLowerInvariant();
        var store = await _db.Stores.AsNoTracking().FirstOrDefaultAsync(x => x.Subdomain == normalizedSubdomain, ct);
        if (store == null) return NotFound(new { error = "store_not_found" });
        var email = req.Email.Trim().ToLowerInvariant();

        var credential = await _db.StoreCustomerCredentials
            .Include(x => x.Customer)
            .FirstOrDefaultAsync(x => x.StoreId == store.Id && x.Email == email && x.IsActive, ct);
        if (credential == null || !BCrypt.Net.BCrypt.Verify(req.Password, credential.PasswordHash))
            return Unauthorized(new { error = "invalid_credentials" });
        if (!credential.EmailVerified) return Unauthorized(new { error = "email_not_verified" });

        var rawToken = Convert.ToHexString(Guid.NewGuid().ToByteArray()) + Convert.ToHexString(Guid.NewGuid().ToByteArray());
        var session = new Models.StoreCustomerSession
        {
            StoreId = store.Id,
            CustomerId = credential.CustomerId,
            TokenHash = HashToken(rawToken),
            UserAgent = Request.Headers.UserAgent.ToString().Length > 60 ? Request.Headers.UserAgent.ToString()[..60] : Request.Headers.UserAgent.ToString(),
            ClientIp = HttpContext.Connection.RemoteIpAddress?.ToString(),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(15),
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.StoreCustomerSessions.Add(session);
        credential.LastLoginAt = DateTimeOffset.UtcNow;
        credential.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        Response.Cookies.Append("sf_customer_session", rawToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Expires = session.ExpiresAt
        });

        return Ok(new
        {
            authenticated = true,
            customer = new { credential.Customer.Id, credential.Customer.Name, credential.Customer.Email, credential.Customer.Phone }
        });
    }

    [HttpPost("{subdomain}/customer-auth/verify-email")]
    public async Task<IActionResult> CustomerVerifyEmail(string subdomain, [FromBody] CustomerVerifyEmailRequest req, CancellationToken ct)
    {
        var normalizedSubdomain = subdomain.Trim().ToLowerInvariant();
        var store = await _db.Stores.AsNoTracking().FirstOrDefaultAsync(x => x.Subdomain == normalizedSubdomain, ct);
        if (store == null) return NotFound(new { error = "store_not_found" });
        var email = req.Email.Trim().ToLowerInvariant();
        var row = await _db.StoreCustomerCredentials.FirstOrDefaultAsync(x => x.StoreId == store.Id && x.Email == email, ct);
        if (row == null) return NotFound(new { error = "customer_not_found" });
        if (row.EmailVerificationExpiresAt.HasValue && row.EmailVerificationExpiresAt.Value < DateTimeOffset.UtcNow)
            return BadRequest(new { error = "otp_expired" });
        if (row.EmailVerificationCodeHash != HashToken(req.Otp.Trim())) return BadRequest(new { error = "invalid_otp" });
        row.EmailVerified = true;
        row.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new { emailVerified = true });
    }

    [HttpPost("{subdomain}/customer-auth/forgot-password")]
    public async Task<IActionResult> CustomerForgotPassword(string subdomain, [FromBody] CustomerForgotPasswordRequest req, CancellationToken ct)
    {
        var normalizedSubdomain = subdomain.Trim().ToLowerInvariant();
        var store = await _db.Stores.AsNoTracking().FirstOrDefaultAsync(x => x.Subdomain == normalizedSubdomain, ct);
        if (store == null) return NotFound(new { error = "store_not_found" });
        var email = req.Email.Trim().ToLowerInvariant();
        var credential = await _db.StoreCustomerCredentials.AsNoTracking().FirstOrDefaultAsync(x => x.StoreId == store.Id && x.Email == email, ct);
        if (credential == null) return Ok(new { sent = true });

        var raw = Convert.ToHexString(Guid.NewGuid().ToByteArray())[..8].ToLowerInvariant();
        _db.StoreCustomerPasswordResets.Add(new Models.StoreCustomerPasswordReset
        {
            StoreId = store.Id,
            CustomerId = credential.CustomerId,
            TokenHash = HashToken(raw),
            ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(20),
            CreatedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync(ct);
        return Ok(new { sent = true, resetToken = raw });
    }

    [HttpPost("{subdomain}/customer-auth/reset-password")]
    public async Task<IActionResult> CustomerResetPassword(string subdomain, [FromBody] CustomerResetPasswordRequest req, CancellationToken ct)
    {
        var normalizedSubdomain = subdomain.Trim().ToLowerInvariant();
        var store = await _db.Stores.AsNoTracking().FirstOrDefaultAsync(x => x.Subdomain == normalizedSubdomain, ct);
        if (store == null) return NotFound(new { error = "store_not_found" });
        var hash = HashToken(req.Token.Trim());
        var reset = await _db.StoreCustomerPasswordResets.FirstOrDefaultAsync(x => x.StoreId == store.Id && x.TokenHash == hash, ct);
        if (reset == null || reset.UsedAt != null || reset.ExpiresAt < DateTimeOffset.UtcNow) return BadRequest(new { error = "token_invalid" });
        var credential = await _db.StoreCustomerCredentials.FirstOrDefaultAsync(x => x.StoreId == store.Id && x.CustomerId == reset.CustomerId, ct);
        if (credential == null) return NotFound(new { error = "customer_not_found" });
        credential.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword, workFactor: 12);
        credential.UpdatedAt = DateTimeOffset.UtcNow;
        reset.UsedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new { reset = true });
    }

    [HttpPost("{subdomain}/customer-auth/mfa/start")]
    public async Task<IActionResult> CustomerMfaStart(string subdomain, [FromBody] CustomerMfaStartRequest req, CancellationToken ct)
    {
        var normalizedSubdomain = subdomain.Trim().ToLowerInvariant();
        var store = await _db.Stores.AsNoTracking().FirstOrDefaultAsync(x => x.Subdomain == normalizedSubdomain, ct);
        if (store == null) return NotFound(new { error = "store_not_found" });
        var email = req.Email.Trim().ToLowerInvariant();
        var credential = await _db.StoreCustomerCredentials.AsNoTracking().FirstOrDefaultAsync(x => x.StoreId == store.Id && x.Email == email && x.MfaEnabled, ct);
        if (credential == null) return BadRequest(new { error = "mfa_not_enabled" });
        var code = "123456";
        _db.StoreCustomerMfaChallenges.Add(new Models.StoreCustomerMfaChallenge
        {
            StoreId = store.Id,
            CustomerId = credential.CustomerId,
            CodeHash = HashToken(code),
            ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(10),
            CreatedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync(ct);
        return Ok(new { challengeIssued = true, otp = code });
    }

    [HttpPost("{subdomain}/customer-auth/mfa/verify")]
    public async Task<IActionResult> CustomerMfaVerify(string subdomain, [FromBody] CustomerMfaVerifyRequest req, CancellationToken ct)
    {
        var normalizedSubdomain = subdomain.Trim().ToLowerInvariant();
        var store = await _db.Stores.AsNoTracking().FirstOrDefaultAsync(x => x.Subdomain == normalizedSubdomain, ct);
        if (store == null) return NotFound(new { error = "store_not_found" });
        var challenge = await _db.StoreCustomerMfaChallenges
            .Where(x => x.StoreId == store.Id && x.CustomerId == req.CustomerId && x.VerifiedAt == null && x.ExpiresAt > DateTimeOffset.UtcNow)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(ct);
        if (challenge == null || challenge.CodeHash != HashToken(req.Otp.Trim())) return BadRequest(new { error = "invalid_otp" });
        challenge.VerifiedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new { verified = true });
    }

    [HttpGet("{subdomain}/customer-auth/me")]
    public async Task<IActionResult> CustomerMe(string subdomain, CancellationToken ct)
    {
        var normalizedSubdomain = subdomain.Trim().ToLowerInvariant();
        var store = await _db.Stores.AsNoTracking().FirstOrDefaultAsync(x => x.Subdomain == normalizedSubdomain, ct);
        if (store == null) return NotFound(new { error = "store_not_found" });
        if (!Request.Cookies.TryGetValue("sf_customer_session", out var rawToken) || string.IsNullOrWhiteSpace(rawToken))
            return Ok(new { authenticated = false });
        var hash = HashToken(rawToken);
        var now = DateTimeOffset.UtcNow;
        var session = await _db.StoreCustomerSessions.AsNoTracking()
            .FirstOrDefaultAsync(x => x.StoreId == store.Id && x.TokenHash == hash && x.ExpiresAt > now, ct);
        if (session == null) return Ok(new { authenticated = false });
        var customer = await _db.Customers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == session.CustomerId, ct);
        if (customer == null) return Ok(new { authenticated = false });
        return Ok(new { authenticated = true, customer = new { customer.Id, customer.Name, customer.Email, customer.Phone } });
    }

    [HttpPost("{subdomain}/customer-auth/logout")]
    public async Task<IActionResult> CustomerLogout(string subdomain, CancellationToken ct)
    {
        var normalizedSubdomain = subdomain.Trim().ToLowerInvariant();
        var store = await _db.Stores.AsNoTracking().FirstOrDefaultAsync(x => x.Subdomain == normalizedSubdomain, ct);
        if (store == null) return NotFound(new { error = "store_not_found" });

        if (Request.Cookies.TryGetValue("sf_customer_session", out var rawToken) && !string.IsNullOrWhiteSpace(rawToken))
        {
            var hash = HashToken(rawToken);
            var rows = await _db.StoreCustomerSessions.Where(x => x.StoreId == store.Id && x.TokenHash == hash).ToListAsync(ct);
            if (rows.Count > 0)
            {
                _db.StoreCustomerSessions.RemoveRange(rows);
                await _db.SaveChangesAsync(ct);
            }
        }

        Response.Cookies.Delete("sf_customer_session");
        return Ok(new { loggedOut = true });
    }

    [HttpGet("{subdomain}/customer-auth/sessions")]
    public async Task<IActionResult> CustomerSessions(string subdomain, CancellationToken ct)
    {
        var normalizedSubdomain = subdomain.Trim().ToLowerInvariant();
        var store = await _db.Stores.AsNoTracking().FirstOrDefaultAsync(x => x.Subdomain == normalizedSubdomain, ct);
        if (store == null) return NotFound(new { error = "store_not_found" });
        if (!Request.Cookies.TryGetValue("sf_customer_session", out var rawToken) || string.IsNullOrWhiteSpace(rawToken))
            return Unauthorized(new { error = "not_authenticated" });
        var hash = HashToken(rawToken);
        var current = await _db.StoreCustomerSessions.AsNoTracking().FirstOrDefaultAsync(x => x.StoreId == store.Id && x.TokenHash == hash && x.ExpiresAt > DateTimeOffset.UtcNow, ct);
        if (current == null) return Unauthorized(new { error = "not_authenticated" });
        var rows = await _db.StoreCustomerSessions.AsNoTracking()
            .Where(x => x.StoreId == store.Id && x.CustomerId == current.CustomerId && x.ExpiresAt > DateTimeOffset.UtcNow)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new { x.Id, x.UserAgent, x.ClientIp, x.CreatedAt, x.ExpiresAt })
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpDelete("{subdomain}/customer-auth/sessions/{sessionId:guid}")]
    public async Task<IActionResult> RevokeCustomerSession(string subdomain, Guid sessionId, CancellationToken ct)
    {
        var normalizedSubdomain = subdomain.Trim().ToLowerInvariant();
        var store = await _db.Stores.AsNoTracking().FirstOrDefaultAsync(x => x.Subdomain == normalizedSubdomain, ct);
        if (store == null) return NotFound(new { error = "store_not_found" });
        if (!Request.Cookies.TryGetValue("sf_customer_session", out var rawToken) || string.IsNullOrWhiteSpace(rawToken))
            return Unauthorized(new { error = "not_authenticated" });
        var hash = HashToken(rawToken);
        var current = await _db.StoreCustomerSessions.AsNoTracking().FirstOrDefaultAsync(x => x.StoreId == store.Id && x.TokenHash == hash && x.ExpiresAt > DateTimeOffset.UtcNow, ct);
        if (current == null) return Unauthorized(new { error = "not_authenticated" });
        var row = await _db.StoreCustomerSessions.FirstOrDefaultAsync(x => x.StoreId == store.Id && x.CustomerId == current.CustomerId && x.Id == sessionId, ct);
        if (row == null) return NotFound(new { error = "session_not_found" });
        _db.StoreCustomerSessions.Remove(row);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{subdomain}/quote-inquiries")]
    public async Task<IActionResult> CreateQuoteInquiry(string subdomain, [FromBody] QuoteInquiryCreateRequest req, CancellationToken ct)
    {
        var normalizedSubdomain = subdomain.Trim().ToLowerInvariant();
        var store = await _db.Stores.AsNoTracking().FirstOrDefaultAsync(x => x.Subdomain == normalizedSubdomain, ct);
        if (store == null) return NotFound(new { error = "store_not_found" });

        if (req.ProductId.HasValue)
        {
            var productExists = await _db.Products.AsNoTracking().AnyAsync(x => x.StoreId == store.Id && x.Id == req.ProductId.Value, ct);
            if (!productExists) return BadRequest(new { error = "invalid_product_id" });
        }

        var row = new Models.StoreQuoteInquiry
        {
            StoreId = store.Id,
            ProductId = req.ProductId,
            Name = req.Name.Trim(),
            Email = req.Email.Trim().ToLowerInvariant(),
            Phone = req.Phone.Trim(),
            Message = req.Message?.Trim() ?? string.Empty,
            Status = "new",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _db.StoreQuoteInquiries.Add(row);
        await _db.SaveChangesAsync(ct);

        var alertEmail = Environment.GetEnvironmentVariable("QUOTE_ALERT_EMAIL");
        if (string.IsNullOrWhiteSpace(alertEmail))
        {
            alertEmail = await _db.StoreThemeConfigs.AsNoTracking()
                .Where(x => x.StoreId == store.Id)
                .Select(x => x.QuoteAlertEmail)
                .FirstOrDefaultAsync(ct);
        }
        if (!string.IsNullOrWhiteSpace(alertEmail))
        {
            await _emailService.SendGenericAsync(
                alertEmail,
                $"New quote inquiry ({store.Subdomain})",
                $"Quote {row.Id}\nName: {row.Name}\nEmail: {row.Email}\nPhone: {row.Phone}\nMessage: {row.Message}",
                ct);
            row.LastNotifiedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync(ct);
        }
        return Ok(new { submitted = true, row.Id, row.Status });
    }

    [HttpPost("{subdomain}/checkout")]
    public async Task<IActionResult> PublicCheckout(string subdomain, [FromBody] PublicCheckoutRequest req, CancellationToken ct)
    {
        var normalizedSubdomain = subdomain.Trim().ToLowerInvariant();
        var store = await _db.Stores.AsNoTracking().FirstOrDefaultAsync(x => x.Subdomain == normalizedSubdomain, ct);
        if (store == null) return NotFound(new { error = "store_not_found" });
        if (req.Items == null || req.Items.Count == 0) return BadRequest(new { error = "cart_empty" });

        var products = await _db.Products.AsNoTracking()
            .Where(x => x.StoreId == store.Id && req.Items.Select(i => i.ProductId).Contains(x.Id))
            .ToListAsync(ct);
        if (products.Count == 0) return BadRequest(new { error = "products_not_found" });

        var customer = await _db.Customers.FirstOrDefaultAsync(x => x.StoreId == store.Id && x.Email == req.Email.Trim().ToLowerInvariant(), ct);
        if (customer == null)
        {
            customer = new Models.Customer
            {
                StoreId = store.Id,
                Name = req.Name.Trim(),
                Email = req.Email.Trim().ToLowerInvariant(),
                Phone = req.Phone.Trim(),
                Type = Models.CustomerType.Retail,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            _db.Customers.Add(customer);
            await _db.SaveChangesAsync(ct);
        }

        decimal subtotal = 0;
        var orderItems = new List<Models.OrderItem>();
        foreach (var item in req.Items)
        {
            var p = products.FirstOrDefault(x => x.Id == item.ProductId);
            if (p == null) continue;
            var qty = Math.Max(1, item.Quantity);
            var total = p.Price * qty;
            subtotal += total;
            orderItems.Add(new Models.OrderItem
            {
                Id = Guid.NewGuid(),
                ProductId = p.Id,
                Title = p.Title,
                SKU = p.SKU,
                Quantity = qty,
                Price = p.Price,
                Total = total
            });
        }

        if (orderItems.Count == 0) return BadRequest(new { error = "cart_invalid" });
        var order = new Models.Order
        {
            Id = Guid.NewGuid(),
            StoreId = store.Id,
            CustomerId = customer.Id,
            Type = Models.OrderType.Retail,
            Status = Models.OrderStatus.Pending,
            PaymentStatus = req.PaymentMethod.Trim().ToLowerInvariant() == "cod" ? Models.PaymentStatus.Pending : Models.PaymentStatus.Pending,
            Subtotal = subtotal,
            Tax = 0,
            Shipping = 0,
            Total = subtotal,
            Currency = store.Currency,
            Notes = $"public_checkout;payment={req.PaymentMethod}",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
            Items = orderItems
        };
        _db.Orders.Add(order);
        await _db.SaveChangesAsync(ct);
        return Ok(new { success = true, orderId = order.Id, total = order.Total, currency = order.Currency });
    }

    [HttpPost("{subdomain}/checkout/{orderId:guid}/payment-callback")]
    public async Task<IActionResult> CheckoutPaymentCallback(string subdomain, Guid orderId, [FromBody] PublicPaymentCallbackRequest req, CancellationToken ct)
    {
        var normalizedSubdomain = subdomain.Trim().ToLowerInvariant();
        var store = await _db.Stores.AsNoTracking().FirstOrDefaultAsync(x => x.Subdomain == normalizedSubdomain, ct);
        if (store == null) return NotFound(new { error = "store_not_found" });
        var order = await _db.Orders.FirstOrDefaultAsync(x => x.StoreId == store.Id && x.Id == orderId, ct);
        if (order == null) return NotFound(new { error = "order_not_found" });

        var status = req.Status.Trim().ToLowerInvariant();
        if (status == "paid")
        {
            order.PaymentStatus = Models.PaymentStatus.Paid;
            order.Status = Models.OrderStatus.Paid;
        }
        else if (status == "failed")
        {
            order.PaymentStatus = Models.PaymentStatus.Pending;
            order.Status = Models.OrderStatus.Pending;
        }
        order.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new { updated = true, order.Id, order.Status, order.PaymentStatus });
    }

    private static IEnumerable<T> ApplyVisibility<T>(IEnumerable<T> source, Func<T, string> key, IReadOnlyCollection<Models.VisibilityRule> rules)
    {
        var allow = rules.Where(x => x.Effect == "allow").Select(x => x.TargetKey).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var deny = rules.Where(x => x.Effect == "deny").Select(x => x.TargetKey).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var hasAllow = allow.Count > 0;
        foreach (var item in source)
        {
            var k = key(item);
            if (deny.Contains(k)) continue;
            if (hasAllow && !allow.Contains(k)) continue;
            yield return item;
        }
    }

    private static string FilterThemeBlocks(string json, IReadOnlyCollection<Models.VisibilityRule> rules)
    {
        var allow = rules.Where(x => x.Effect == "allow").Select(x => x.TargetKey).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var deny = rules.Where(x => x.Effect == "deny").Select(x => x.TargetKey).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var hasAllow = allow.Count > 0;
        try
        {
            var arr = JsonNode.Parse(json)?.AsArray();
            if (arr == null) return "[]";
            var output = new JsonArray();
            foreach (var n in arr)
            {
                if (n is not JsonObject obj) continue;
                var blockId = obj["id"]?.ToString()?.ToLowerInvariant();
                if (!string.IsNullOrWhiteSpace(blockId))
                {
                    if (deny.Contains(blockId)) continue;
                    if (hasAllow && !allow.Contains(blockId)) continue;
                }
                output.Add(n);
            }
            return output.ToJsonString();
        }
        catch
        {
            return json;
        }
    }

    private static string HashToken(string token)
    {
        using var sha = SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}

public class QuoteInquiryCreateRequest
{
    public Guid? ProductId { get; set; }
    [Required, StringLength(200, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;
    [Required, EmailAddress, StringLength(320)]
    public string Email { get; set; } = string.Empty;
    [Required, StringLength(20, MinimumLength = 8)]
    public string Phone { get; set; } = string.Empty;
    [StringLength(1200)]
    public string? Message { get; set; }
}

public class PublicCheckoutRequest
{
    [Required, StringLength(200, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;
    [Required, EmailAddress, StringLength(320)]
    public string Email { get; set; } = string.Empty;
    [Required, StringLength(20, MinimumLength = 8)]
    public string Phone { get; set; } = string.Empty;
    [Required, StringLength(40)]
    public string PaymentMethod { get; set; } = "cod";
    [Required]
    public List<PublicCheckoutItem> Items { get; set; } = new();
}

public class PublicCheckoutItem
{
    [Required]
    public Guid ProductId { get; set; }
    [Range(1, 9999)]
    public int Quantity { get; set; } = 1;
}

public class PublicPaymentCallbackRequest
{
    [Required, RegularExpression("^(paid|failed)$")]
    public string Status { get; set; } = "paid";
}

public class CustomerRegisterRequest
{
    [Required, StringLength(200, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;
    [Required, EmailAddress, StringLength(320)]
    public string Email { get; set; } = string.Empty;
    [Required, StringLength(20, MinimumLength = 8)]
    public string Phone { get; set; } = string.Empty;
    [Required, StringLength(80, MinimumLength = 8)]
    public string Password { get; set; } = string.Empty;
}

public class CustomerLoginRequest
{
    [Required, EmailAddress, StringLength(320)]
    public string Email { get; set; } = string.Empty;
    [Required, StringLength(80, MinimumLength = 8)]
    public string Password { get; set; } = string.Empty;
}

public class CustomerVerifyEmailRequest
{
    [Required, EmailAddress, StringLength(320)]
    public string Email { get; set; } = string.Empty;
    [Required, StringLength(6, MinimumLength = 4)]
    public string Otp { get; set; } = string.Empty;
}

public class CustomerForgotPasswordRequest
{
    [Required, EmailAddress, StringLength(320)]
    public string Email { get; set; } = string.Empty;
}

public class CustomerResetPasswordRequest
{
    [Required, StringLength(64, MinimumLength = 4)]
    public string Token { get; set; } = string.Empty;
    [Required, StringLength(80, MinimumLength = 8)]
    public string NewPassword { get; set; } = string.Empty;
}

public class CustomerMfaStartRequest
{
    [Required, EmailAddress, StringLength(320)]
    public string Email { get; set; } = string.Empty;
}

public class CustomerMfaVerifyRequest
{
    [Required]
    public Guid CustomerId { get; set; }
    [Required, StringLength(6, MinimumLength = 4)]
    public string Otp { get; set; } = string.Empty;
}
