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
import { Label } from "../../components/ui/label";
import useApiList from "../../hooks/useApiList";
import useActiveStore from "../../hooks/useActiveStore";
import { mapCustomerFromApi } from "../../lib/mappers";
import { formatCurrency, formatDate, getInitials } from "../../lib/utils";
import api from "../../lib/api";
import {
  Search,
  MoreHorizontal,
  Eye,
  Mail,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Download,
  Users,
  UserCheck,
  Crown,
  TrendingUp,
} from "lucide-react";

const buildCustomerPayload = (form, storeId, currentCustomer) => {
  const base = currentCustomer?.raw || {};
  return {
    ...base,
    id: currentCustomer?.id || base.id,
    storeId,
    name: form.name.trim(),
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    type: form.type === "Business" ? 1 : 0,
    gstin: form.gstin.trim() || null,
    companyName: form.companyName.trim() || null,
    addresses: base.addresses?.length
      ? base.addresses
      : [
          {
            label: "Default",
            line1: "Address not provided",
            city: "NA",
            state: "NA",
            postalCode: "000000",
            country: "India",
            isDefault: true,
          },
        ],
  };
};

const CustomerDialog = ({ open, onOpenChange, mode, initialValues, onSubmit, loading }) => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    type: "Retail",
    gstin: "",
    companyName: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      name: initialValues?.name || "",
      email: initialValues?.email || "",
      phone: initialValues?.phone === "-" ? "" : initialValues?.phone || "",
      type: initialValues?.customerType || "Retail",
      gstin: initialValues?.raw?.gstin || "",
      companyName: initialValues?.raw?.companyName || "",
    });
  }, [open, initialValues]);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Customer" : "Add Customer"}</DialogTitle>
          <DialogDescription>Save customer details to your store.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setField("name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => setField("email", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Customer Type</Label>
              <Select value={form.type} onValueChange={(value) => setField("type", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Retail">Retail</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>GSTIN</Label>
              <Input value={form.gstin} onChange={(e) => setField("gstin", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input value={form.companyName} onChange={(e) => setField("companyName", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSubmit(form)} disabled={loading || !form.name.trim()}>
            {loading ? "Saving..." : mode === "edit" ? "Update Customer" : "Add Customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const getSegmentBadge = (segment) => {
  const styles = {
    VIP: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
    Regular: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    New: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  };

  return (
    <Badge variant="secondary" className={styles[segment] || styles.New}>
      {segment === "VIP" && <Crown className="w-3 h-3 mr-1" />}
      {segment}
    </Badge>
  );
};

const getStatusBadge = (status) => {
  const styles = {
    active: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    inactive: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  };

  return (
    <Badge variant="secondary" className={styles[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

export const Customers = () => {
  const { storeId, loadingStores } = useActiveStore();
  const { data: apiCustomers, loading } = useApiList("/customers", { storeId, enabled: !!storeId });
  const [searchQuery, setSearchQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const customers = rows;

  useEffect(() => {
    setRows((apiCustomers ?? []).map(mapCustomerFromApi));
  }, [apiCustomers]);

  const filteredCustomers = customers.filter(
    (customer) =>
      (customer.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSpent = customers.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
  const activeCustomers = customers.filter((c) => c.status === "active").length;
  const vipCustomers = customers.filter((c) => c.segment === "VIP").length;

  const openCreateDialog = () => {
    setDialogMode("create");
    setEditingCustomer(null);
    setError("");
    setDialogOpen(true);
  };

  const openEditDialog = (customer) => {
    setDialogMode("edit");
    setEditingCustomer(customer);
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async (form) => {
    if (!storeId) return;
    setSaving(true);
    setError("");
    try {
      const payload = buildCustomerPayload(form, storeId, editingCustomer);
      if (dialogMode === "edit" && editingCustomer) {
        const res = await api.put(`/customers/${editingCustomer.id}`, payload);
        const updated = mapCustomerFromApi(res.data);
        setRows((prev) => prev.map((c) => (c.id === editingCustomer.id ? updated : c)));
      } else {
        const res = await api.post("/customers", payload);
        setRows((prev) => [mapCustomerFromApi(res.data), ...prev]);
      }
      setDialogOpen(false);
    } catch (_) {
      setError("Could not save customer. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (customerId) => {
    if (!storeId) return;
    try {
      await api.delete(`/customers/${customerId}`, { params: { storeId } });
      setRows((prev) => prev.filter((customer) => customer.id !== customerId));
    } catch (_) {
      setError("Could not delete customer. Please try again.");
    }
  };

  return (
    <div className="space-y-6" data-testid="customers-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Customers</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Manage your customer relationships
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-lg" data-testid="export-customers-btn">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button className="rounded-lg bg-blue-600 hover:bg-blue-700" data-testid="add-customer-btn" onClick={openCreateDialog}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Customers</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{customers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Active</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{activeCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">VIP Customers</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{vipCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Revenue</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalSpent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Card */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search customers..."
                className="pl-9 rounded-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="search-customers"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-40 rounded-lg" data-testid="filter-segment">
                <SelectValue placeholder="Segment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Segments</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="new">New</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-40 rounded-lg" data-testid="filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-0">
          {loadingStores || loading ? (
            <div className="p-6 text-sm text-slate-500 dark:text-slate-400">Loading customers...</div>
          ) : !storeId ? (
            <div className="p-6 text-sm text-amber-600 dark:text-amber-400">Store is not selected. Set `REACT_APP_STORE_ID` or login with a store role.</div>
          ) : null}
          {error ? <div className="px-6 py-3 text-sm text-red-600 dark:text-red-400">{error}</div> : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  data-testid={`customer-row-${customer.id}`}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${customer.name}`} />
                        <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {customer.name}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {customer.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400">
                    {customer.phone}
                  </TableCell>
                  <TableCell>{customer.orders}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(customer.totalSpent)}
                  </TableCell>
                  <TableCell>{getSegmentBadge(customer.segment)}</TableCell>
                  <TableCell>{getStatusBadge(customer.status)}</TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400">
                    {formatDate(customer.joinDate)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`customer-actions-${customer.id}`}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="cursor-pointer" onClick={() => openEditDialog(customer)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          <Mail className="w-4 h-4 mr-2" />
                          Send Email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer text-red-600 dark:text-red-400" onClick={() => handleDelete(customer.id)}>
                          Delete
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
              Showing {filteredCustomers.length} of {customers.length} customers
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
      <CustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        initialValues={editingCustomer}
        onSubmit={handleSave}
        loading={saving}
      />
    </div>
  );
};

export default Customers;
