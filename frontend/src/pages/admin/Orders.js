import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
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
  DropdownMenuLabel,
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
import useApiList from "../../hooks/useApiList";
import { formatCurrency, formatDateTime, getInitials } from "../../lib/utils";
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
  Phone,
  Mail,
  Download,
  RefreshCw,
} from "lucide-react";

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

const OrderDetailsDialog = ({ order, open, onOpenChange }) => {
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
              Order Items ({order.items})
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
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <Package className="w-5 h-5 text-slate-400" />
                        </div>
                        <span className="font-medium">Sample Product</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">1</TableCell>
                    <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
                  </TableRow>
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
          <Button variant="outline" className="flex-1">
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
  const storeId = process.env.REACT_APP_STORE_ID;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { data: apiOrders } = useApiList("/orders", { storeId, enabled: !!storeId });

  const orders = apiOrders ?? [];

  const filteredOrders = orders.filter(
    (order) =>
      (order.id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
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
                  <TableCell>{order.items} items</TableCell>
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
                        <DropdownMenuItem className="cursor-pointer">
                          <Truck className="w-4 h-4 mr-2" />
                          Update Status
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer text-red-600 dark:text-red-400">
                          <X className="w-4 h-4 mr-2" />
                          Cancel Order
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
      />
    </div>
  );
};

export default Orders;
