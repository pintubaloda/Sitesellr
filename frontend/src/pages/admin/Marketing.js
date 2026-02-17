import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { discounts } from "../../lib/mock-data";
import { formatCurrency, formatDate } from "../../lib/utils";
import {
  Plus,
  Search,
  Percent,
  Tag,
  Calendar,
  Copy,
  Edit,
  Trash2,
  MoreHorizontal,
  TrendingUp,
  Gift,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

const getStatusBadge = (status) => {
  const styles = {
    active: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    expired: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
    scheduled: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  };

  const icons = {
    active: CheckCircle,
    expired: XCircle,
    scheduled: Clock,
  };

  const Icon = icons[status] || CheckCircle;

  return (
    <Badge variant="secondary" className={styles[status] || styles.active}>
      <Icon className="w-3 h-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

const CreateDiscountDialog = ({ open, onOpenChange }) => {
  const [discountType, setDiscountType] = useState("percentage");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Discount</DialogTitle>
          <DialogDescription>
            Create a new discount code for your customers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Discount Code</Label>
            <div className="flex gap-2">
              <Input placeholder="e.g., SUMMER20" className="uppercase" data-testid="discount-code-input" />
              <Button variant="outline" size="icon">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Discount Type</Label>
            <Select value={discountType} onValueChange={setDiscountType}>
              <SelectTrigger data-testid="discount-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                {discountType === "percentage" ? "Discount (%)" : "Discount (₹)"}
              </Label>
              <Input type="number" placeholder="0" data-testid="discount-value-input" />
            </div>
            <div className="space-y-2">
              <Label>Minimum Order (₹)</Label>
              <Input type="number" placeholder="0" data-testid="min-order-input" />
            </div>
          </div>

          {discountType === "percentage" && (
            <div className="space-y-2">
              <Label>Maximum Discount (₹)</Label>
              <Input type="number" placeholder="No limit" data-testid="max-discount-input" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valid From</Label>
              <Input type="date" data-testid="valid-from-input" />
            </div>
            <div className="space-y-2">
              <Label>Valid To</Label>
              <Input type="date" data-testid="valid-to-input" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Usage Limit</Label>
            <Input type="number" placeholder="Unlimited" data-testid="usage-limit-input" />
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Limit to one per customer</p>
              <p className="text-sm text-slate-500">Each customer can only use this code once</p>
            </div>
            <Switch data-testid="one-per-customer-switch" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" data-testid="create-discount-btn">
            Create Discount
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const Marketing = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const filteredDiscounts = discounts.filter((discount) =>
    discount.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeDiscounts = discounts.filter((d) => d.status === "active").length;
  const totalUsage = discounts.reduce((acc, d) => acc + d.usedCount, 0);

  return (
    <div className="space-y-6" data-testid="marketing-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Marketing</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Manage discounts, coupons, and campaigns
          </p>
        </div>
        <Button
          className="rounded-lg bg-blue-600 hover:bg-blue-700"
          onClick={() => setCreateDialogOpen(true)}
          data-testid="create-discount-trigger"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Discount
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Discounts</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{discounts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Active</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{activeDiscounts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Usage</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{totalUsage}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                <Gift className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Avg. Discount</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">18%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discounts Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Discount Codes</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search discounts..."
                className="pl-9 rounded-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="search-discounts"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Min Order</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDiscounts.map((discount) => (
                <TableRow key={discount.id} data-testid={`discount-row-${discount.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-sm font-mono">
                        {discount.code}
                      </code>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {discount.type === "percentage" ? <Percent className="w-3 h-3 mr-1" /> : "₹"}
                      {discount.type === "percentage" ? "Percentage" : "Fixed"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {discount.type === "percentage"
                      ? `${discount.value}%`
                      : formatCurrency(discount.value)}
                  </TableCell>
                  <TableCell>{formatCurrency(discount.minOrder)}</TableCell>
                  <TableCell>
                    <span className="text-slate-500 dark:text-slate-400">
                      {discount.usedCount} / {discount.usageLimit}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400">
                    {formatDate(discount.validTo)}
                  </TableCell>
                  <TableCell>{getStatusBadge(discount.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="cursor-pointer">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer text-red-600 dark:text-red-400">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateDiscountDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
};

export default Marketing;
