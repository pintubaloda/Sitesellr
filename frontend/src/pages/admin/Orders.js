import { useEffect, useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Separator } from "../../components/ui/separator";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import useApiList from "../../hooks/useApiList";
import useActiveStore from "../../hooks/useActiveStore";
import { mapOrderFromApi } from "../../lib/mappers";
import { formatCurrency, formatDateTime, getInitials } from "../../lib/utils";
import api from "../../lib/api";
import {
  Search,
  MoreHorizontal,
  Eye,
  Printer,
  Truck,
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  MapPin,
  Mail,
  Download,
  RefreshCw,
  Plus,
} from "lucide-react";

const STATUS_TO_API = {
  pending: 0,
  processing: 1,
  shipped: 2,
  delivered: 3,
  cancelled: 4,
};

const PAYMENT_TO_API = {
  pending: 0,
  paid: 1,
  refunded: 3,
};

const buildOrderPayload = (form, storeId, currentOrder) => {
  const base = currentOrder?.raw || {};
  const subtotal = Number(form.total || 0);
  const shipping = Number(form.shipping || 0);
  const tax = Number(form.tax || 0);
  return {
    ...base,
    id: currentOrder?.id || base.id,
    storeId,
    customerId: form.customerId?.trim() || null,
    type: base.type ?? 0,
    status: STATUS_TO_API[form.status] ?? 0,
    paymentStatus: PAYMENT_TO_API[form.paymentStatus] ?? 0,
    subtotal,
    tax,
    shipping,
    total: subtotal + shipping + tax,
    currency: "INR",
    notes: form.notes.trim() || null,
    items: base.items || [],
  };
};

const OrderFormDialog = ({ open, onOpenChange, mode, initialValues, onSubmit, loading }) => {
  const [form, setForm] = useState({
    customerId: "",
    status: "pending",
    paymentStatus: "pending",
    total: "",
    shipping: "0",
    tax: "0",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      customerId: initialValues?.raw?.customerId || "",
      status: initialValues?.status || "pending",
      paymentStatus: initialValues?.paymentStatus || "pending",
      total: initialValues?.raw?.subtotal != null ? String(initialValues.raw.subtotal) : initialValues?.total != null ? String(initialValues.total) : "",
      shipping: initialValues?.raw?.shipping != null ? String(initialValues.raw.shipping) : "0",
      tax: initialValues?.raw?.tax != null ? String(initialValues.raw.tax) : "0",
      notes: initialValues?.raw?.notes || "",
    });
  }, [open, initialValues]);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Update Order" : "Create Order"}</DialogTitle>
          <DialogDescription>Save order details for this store.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Customer ID (optional)</Label>
            <Input value={form.customerId} onChange={(e) => setField("customerId", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setField("status", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment</Label>
              <Select value={form.paymentStatus} onValueChange={(value) => setField("paymentStatus", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Subtotal</Label>
              <Input type="number" value={form.total} onChange={(e) => setField("total", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Shipping</Label>
              <Input type="number" value={form.shipping} onChange={(e) => setField("shipping", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tax</Label>
              <Input type="number" value={form.tax} onChange={(e) => setField("tax", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSubmit(form)} disabled={loading || !form.total}>
            {loading ? "Saving..." : mode === "edit" ? "Update Order" : "Create Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const getStatusBadge = (status) => {
  const styles = {
    pending: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
    processing: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    shipped: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
    delivered: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    cancelled: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  };

  return (
    <Badge variant="secondary" className={styles[status] || styles.pending}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

const getPaymentBadge = (status) => {
  const styles = {
    paid: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    pending: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
    refunded: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  };

  return (
    <Badge variant="secondary" className={styles[status] || styles.pending}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

const OrderDetailsDialog = ({ order, open, onOpenChange, onUpdate }) => {
  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="font-mono">{order.id}</DialogTitle>
              <DialogDescription>
                Placed on {formatDateTime(order.date)}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(order.status)}
              {getPaymentBadge(order.paymentStatus)}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Info */}
          <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
            <Avatar className="h-12 w-12">
              <AvatarImage src={order.customer.avatar} />
              <AvatarFallback>{getInitials(order.customer.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-900 dark:text-white">
                {order.customer.name}
              </h4>
              <div className="flex flex-col gap-1 mt-2 text-sm text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {order.customer.email}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {order.shippingAddress}
                </div>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3">
              Order Items ({order.itemsCount})
            </h4>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Package className="w-5 h-5 text-slate-400" />
                          </div>
                          <span className="font-medium">{item.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Order Summary */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                <span className="text-slate-900 dark:text-white">{formatCurrency(order.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Shipping</span>
                <span className="text-slate-900 dark:text-white">Free</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">GST (18%)</span>
                <span className="text-slate-900 dark:text-white">{formatCurrency(order.total * 0.18)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold">
                <span className="text-slate-900 dark:text-white">Total</span>
                <span className="text-slate-900 dark:text-white">{formatCurrency(order.total * 1.18)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" className="flex-1">
            <Printer className="w-4 h-4 mr-2" />
            Print Invoice
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => onUpdate(order)}>
            <Truck className="w-4 h-4 mr-2" />
            Update Status
          </Button>
          <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const Orders = () => {
  const { storeId, loadingStores } = useActiveStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editingOrder, setEditingOrder] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { data: apiOrders, loading } = useApiList("/orders", { storeId, enabled: !!storeId });
  const orders = rows;

  useEffect(() => {
    setRows((apiOrders ?? []).map(mapOrderFromApi));
  }, [apiOrders]);

  const filteredOrders = orders.filter(
    (order) =>
      (order.id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  const openCreateOrder = () => {
    setFormMode("create");
    setEditingOrder(null);
    setError("");
    setFormOpen(true);
  };

  const openUpdateOrder = (order) => {
    setFormMode("edit");
    setEditingOrder(order);
    setDetailsOpen(false);
    setError("");
    setFormOpen(true);
  };

  const handleSave = async (form) => {
    if (!storeId) return;
    setSaving(true);
    setError("");
    try {
      const payload = buildOrderPayload(form, storeId, editingOrder);
      if (formMode === "edit" && editingOrder) {
        const res = await api.put(`/orders/${editingOrder.id}`, payload);
        const updated = mapOrderFromApi(res.data);
        setRows((prev) => prev.map((order) => (order.id === editingOrder.id ? updated : order)));
      } else {
        const res = await api.post("/orders", payload);
        setRows((prev) => [mapOrderFromApi(res.data), ...prev]);
      }
      setFormOpen(false);
    } catch (_) {
      setError("Could not save order. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (orderId) => {
    if (!storeId) return;
    try {
      await api.delete(`/orders/${orderId}`, { params: { storeId } });
      setRows((prev) => prev.filter((order) => order.id !== orderId));
      if (selectedOrder?.id === orderId) {
        setDetailsOpen(false);
        setSelectedOrder(null);
      }
    } catch (_) {
      setError("Could not delete order. Please try again.");
    }
  };

  return (
    <div className="space-y-6" data-testid="orders-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Orders</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Manage and track your orders
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="rounded-lg bg-blue-600 hover:bg-blue-700" onClick={openCreateOrder}>
            <Plus className="w-4 h-4 mr-2" />
            Create Order
          </Button>
          <Button variant="outline" className="rounded-lg" data-testid="export-orders-btn">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" className="rounded-lg" data-testid="refresh-orders-btn">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: orders.length, color: "blue" },
          { label: "Pending", value: orders.filter((o) => o.status === "pending").length, color: "yellow" },
          { label: "Processing", value: orders.filter((o) => o.status === "processing").length, color: "purple" },
          { label: "Delivered", value: orders.filter((o) => o.status === "delivered").length, color: "green" },
        ].map((stat) => (
          <Card key={stat.label} className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters Card */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search orders..."
                className="pl-9 rounded-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="search-orders"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-40 rounded-lg" data-testid="filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-40 rounded-lg" data-testid="filter-payment">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-0">
          {loadingStores || loading ? (
            <div className="p-6 text-sm text-slate-500 dark:text-slate-400">Loading orders...</div>
          ) : !storeId ? (
            <div className="p-6 text-sm text-amber-600 dark:text-amber-400">Store is not selected. Set `REACT_APP_STORE_ID` or login with a store role.</div>
          ) : null}
          {error ? <div className="px-6 py-3 text-sm text-red-600 dark:text-red-400">{error}</div> : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  onClick={() => handleViewOrder(order)}
                  data-testid={`order-row-${order.id}`}
                >
                  <TableCell>
                    <span className="font-mono text-sm text-blue-600 dark:text-blue-400">
                      {order.id}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={order.customer.avatar} />
                        <AvatarFallback className="text-xs">
                          {getInitials(order.customer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{order.customer.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {order.customer.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400">
                    {formatDateTime(order.date)}
                  </TableCell>
                  <TableCell>{order.itemsCount} items</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>{getPaymentBadge(order.paymentStatus)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(order.total)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`order-actions-${order.id}`}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="cursor-pointer" onClick={() => handleViewOrder(order)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          <Printer className="w-4 h-4 mr-2" />
                          Print Invoice
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => openUpdateOrder(order)}>
                          <Truck className="w-4 h-4 mr-2" />
                          Update Status
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer text-red-600 dark:text-red-400" onClick={() => handleDelete(order.id)}>
                          <X className="w-4 h-4 mr-2" />
                          Delete Order
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-4 border-t border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing {filteredOrders.length} of {orders.length} orders
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-lg" disabled>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                1
              </Button>
              <Button variant="outline" size="sm" className="rounded-lg">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        order={selectedOrder}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onUpdate={openUpdateOrder}
      />
      <OrderFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initialValues={editingOrder}
        onSubmit={handleSave}
        loading={saving}
      />
    </div>
  );
};

export default Orders;
