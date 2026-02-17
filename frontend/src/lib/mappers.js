const PRODUCT_STATUS = {
  0: "draft",
  1: "active",
  2: "archived",
};

const ORDER_STATUS = {
  0: "pending",
  1: "processing",
  2: "shipped",
  3: "delivered",
  4: "cancelled",
  5: "cancelled",
};

const PAYMENT_STATUS = {
  0: "pending",
  1: "paid",
  2: "pending",
  3: "refunded",
};

const CUSTOMER_TYPE = {
  0: "Retail",
  1: "Business",
};

const storePlaceholder =
  "https://placehold.co/80x80/F1F5F9/475569?text=No+Image";

const statusFromStock = (stock, rawStatus) => {
  if (stock <= 0) return "out_of_stock";
  if (stock < 20) return "low_stock";
  if (rawStatus === "archived") return "out_of_stock";
  return "active";
};

const toIsoDate = (value) => {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

const safeCustomer = (customer) => ({
  name: customer?.name || "Guest",
  email: customer?.email || "",
  avatar: customer?.avatar || "",
});

export const mapProductFromApi = (item) => {
  const totalStock = (item.variants || []).reduce(
    (sum, variant) => sum + Number(variant.quantity || 0),
    0
  );
  const sortedMedia = [...(item.media || [])].sort(
    (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
  );
  const rawStatus = PRODUCT_STATUS[item.status] || "draft";

  return {
    id: item.id,
    name: item.title || "Untitled product",
    sku: item.sku || "-",
    category: item.category?.name || "General",
    price: Number(item.price || 0),
    stock: totalStock,
    status: statusFromStock(totalStock, rawStatus),
    image: sortedMedia[0]?.url || storePlaceholder,
    sales: Number(item.sales || 0),
    raw: item,
  };
};

export const mapCustomerFromApi = (item) => {
  const totalSpent = (item.orders || []).reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );
  const ordersCount = Number(item.orders?.length || 0);
  const segment =
    item.type === 1 || totalSpent >= 50000
      ? "VIP"
      : ordersCount > 0
      ? "Regular"
      : "New";

  return {
    id: item.id,
    name: item.name || "Unnamed customer",
    email: item.email || "",
    phone: item.phone || "-",
    orders: ordersCount,
    totalSpent,
    status: "active",
    joinDate: toIsoDate(item.createdAt),
    segment,
    customerType: CUSTOMER_TYPE[item.type] || "Retail",
    raw: item,
  };
};

export const mapOrderFromApi = (item) => {
  const customer = safeCustomer(item.customer);
  const items = item.items || [];
  const shippingAddress = item.customer?.addresses?.find((x) => x.isDefault)
    || item.customer?.addresses?.[0];
  const shippingText = shippingAddress
    ? [shippingAddress.line1, shippingAddress.line2, shippingAddress.city, shippingAddress.state, shippingAddress.postalCode]
        .filter(Boolean)
        .join(", ")
    : "Address not available";

  return {
    id: item.id,
    customer,
    items,
    itemsCount: Number(items.length || 0),
    total: Number(item.total || 0),
    status: ORDER_STATUS[item.status] || "pending",
    paymentStatus: PAYMENT_STATUS[item.paymentStatus] || "pending",
    date: toIsoDate(item.createdAt),
    shippingAddress: shippingText,
    raw: item,
  };
};

export const buildRevenueSeries = (orders) => {
  const bucket = new Map();
  orders.forEach((order) => {
    const dt = new Date(order.date);
    if (Number.isNaN(dt.getTime())) return;
    const month = dt.toLocaleString("en-IN", { month: "short" });
    const current = bucket.get(month) || { month, revenue: 0, orders: 0 };
    current.revenue += Number(order.total || 0);
    current.orders += 1;
    bucket.set(month, current);
  });
  return Array.from(bucket.values());
};
