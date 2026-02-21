using backend_dotnet.Data;
using backend_dotnet.Models;
using backend_dotnet.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

public class OrdersController : BaseApiController
{
    private readonly AppDbContext _db;

    public OrdersController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [Authorize(Policy = Policies.OrdersRead)]
    public async Task<IActionResult> List([FromQuery] Guid storeId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
    {
        if (storeId == Guid.Empty) return BadRequest(new { error = "store_required" });
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var orders = await _db.Orders.AsNoTracking()
            .Where(o => o.StoreId == storeId)
            .Include(o => o.Items)
            .Include(o => o.Customer)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return Ok(orders.Select(ToResponse));
    }

    [HttpPost]
    [Authorize(Policy = Policies.OrdersWrite)]
    public async Task<IActionResult> Create([FromBody] OrderUpsertRequest input, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        if (input.StoreId == Guid.Empty) return BadRequest(new { error = "store_required" });
        if (Tenancy?.Store != null && Tenancy.Store.Id != input.StoreId) return Forbid();

        var created = new Order
        {
            Id = Guid.NewGuid(),
            StoreId = input.StoreId,
            CustomerId = input.CustomerId,
            Type = input.Type,
            Status = input.Status,
            PaymentStatus = input.PaymentStatus,
            Subtotal = input.Subtotal,
            Tax = input.Tax,
            Shipping = input.Shipping,
            Total = input.Total,
            Currency = string.IsNullOrWhiteSpace(input.Currency) ? "INR" : input.Currency,
            Notes = input.Notes,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
            Items = (input.Items ?? new List<OrderItemUpsertRequest>()).Select(i => new OrderItem
            {
                Id = i.Id == Guid.Empty ? Guid.NewGuid() : i.Id,
                ProductId = i.ProductId,
                VariantId = i.VariantId,
                Title = i.Title ?? string.Empty,
                SKU = i.SKU,
                Quantity = i.Quantity,
                Price = i.Price,
                Total = i.Total
            }).ToList()
        };

        _db.Orders.Add(created);
        await _db.SaveChangesAsync(ct);

        var row = await _db.Orders.AsNoTracking()
            .Include(o => o.Items)
            .Include(o => o.Customer)
            .FirstOrDefaultAsync(o => o.Id == created.Id, ct);
        return row == null
            ? CreatedAtAction(nameof(Get), new { id = created.Id, storeId = created.StoreId }, new { id = created.Id })
            : CreatedAtAction(nameof(Get), new { id = row.Id, storeId = row.StoreId }, ToResponse(row));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = Policies.OrdersRead)]
    public async Task<IActionResult> Get(Guid id, [FromQuery] Guid storeId, CancellationToken ct)
    {
        if (storeId == Guid.Empty) return BadRequest(new { error = "store_required" });
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();

        var order = await _db.Orders.AsNoTracking()
            .Include(o => o.Items)
            .Include(o => o.Customer)
            .FirstOrDefaultAsync(o => o.Id == id && o.StoreId == storeId, ct);

        return order == null ? NotFound() : Ok(ToResponse(order));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Policies.OrdersWrite)]
    public async Task<IActionResult> Update(Guid id, [FromBody] OrderUpsertRequest input, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        if (input.StoreId == Guid.Empty) return BadRequest(new { error = "store_required" });
        if (Tenancy?.Store != null && Tenancy.Store.Id != input.StoreId) return Forbid();
        if (id != input.Id && input.Id != Guid.Empty) return BadRequest(new { error = "id_mismatch" });

        var order = await _db.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id && o.StoreId == input.StoreId, ct);
        if (order == null) return NotFound();

        order.CustomerId = input.CustomerId;
        order.Type = input.Type;
        order.Status = input.Status;
        order.PaymentStatus = input.PaymentStatus;
        order.Subtotal = input.Subtotal;
        order.Tax = input.Tax;
        order.Shipping = input.Shipping;
        order.Total = input.Total;
        order.Currency = string.IsNullOrWhiteSpace(input.Currency) ? order.Currency : input.Currency;
        order.Notes = input.Notes;
        order.UpdatedAt = DateTimeOffset.UtcNow;

        _db.OrderItems.RemoveRange(order.Items);
        order.Items = (input.Items ?? new List<OrderItemUpsertRequest>()).Select(i => new OrderItem
        {
            Id = i.Id == Guid.Empty ? Guid.NewGuid() : i.Id,
            OrderId = order.Id,
            ProductId = i.ProductId,
            VariantId = i.VariantId,
            Title = i.Title ?? string.Empty,
            SKU = i.SKU,
            Quantity = i.Quantity,
            Price = i.Price,
            Total = i.Total
        }).ToList();

        await _db.SaveChangesAsync(ct);

        var row = await _db.Orders.AsNoTracking()
            .Include(o => o.Items)
            .Include(o => o.Customer)
            .FirstOrDefaultAsync(o => o.Id == order.Id, ct);
        return row == null ? Ok(new { id = order.Id }) : Ok(ToResponse(row));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Policies.OrdersWrite)]
    public async Task<IActionResult> Delete(Guid id, [FromQuery] Guid storeId, CancellationToken ct)
    {
        if (storeId == Guid.Empty) return BadRequest(new { error = "store_required" });
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == id && o.StoreId == storeId, ct);
        if (order == null) return NotFound();
        _db.Orders.Remove(order);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static OrderResponse ToResponse(Order o)
    {
        return new OrderResponse
        {
            Id = o.Id,
            StoreId = o.StoreId,
            CustomerId = o.CustomerId,
            Customer = o.Customer == null
                ? null
                : new OrderCustomerResponse
                {
                    Id = o.Customer.Id,
                    Name = o.Customer.Name,
                    Email = o.Customer.Email
                },
            Type = o.Type,
            Status = o.Status,
            PaymentStatus = o.PaymentStatus,
            Subtotal = o.Subtotal,
            Tax = o.Tax,
            Shipping = o.Shipping,
            Total = o.Total,
            Currency = o.Currency,
            Notes = o.Notes,
            CreatedAt = o.CreatedAt,
            UpdatedAt = o.UpdatedAt,
            Items = (o.Items ?? new List<OrderItem>()).Select(i => new OrderItemResponse
            {
                Id = i.Id,
                OrderId = i.OrderId,
                ProductId = i.ProductId,
                VariantId = i.VariantId,
                Title = i.Title,
                SKU = i.SKU,
                Quantity = i.Quantity,
                Price = i.Price,
                Total = i.Total
            }).ToList()
        };
    }
}

public class OrderUpsertRequest
{
    public Guid Id { get; set; }
    public Guid StoreId { get; set; }
    public Guid? CustomerId { get; set; }
    public OrderType Type { get; set; } = OrderType.Retail;
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;
    public decimal Subtotal { get; set; }
    public decimal Tax { get; set; }
    public decimal Shipping { get; set; }
    public decimal Total { get; set; }
    public string Currency { get; set; } = "INR";
    public string? Notes { get; set; }
    public List<OrderItemUpsertRequest> Items { get; set; } = new();
}

public class OrderItemUpsertRequest
{
    public Guid Id { get; set; }
    public Guid? ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public string? Title { get; set; }
    public string? SKU { get; set; }
    public int Quantity { get; set; }
    public decimal Price { get; set; }
    public decimal Total { get; set; }
}

public class OrderResponse
{
    public Guid Id { get; set; }
    public Guid StoreId { get; set; }
    public Guid? CustomerId { get; set; }
    public OrderCustomerResponse? Customer { get; set; }
    public OrderType Type { get; set; }
    public OrderStatus Status { get; set; }
    public PaymentStatus PaymentStatus { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Tax { get; set; }
    public decimal Shipping { get; set; }
    public decimal Total { get; set; }
    public string Currency { get; set; } = "INR";
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public List<OrderItemResponse> Items { get; set; } = new();
}

public class OrderItemResponse
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public Guid? ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? SKU { get; set; }
    public int Quantity { get; set; }
    public decimal Price { get; set; }
    public decimal Total { get; set; }
}

public class OrderCustomerResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
}
