import { useEffect, useRef, useState } from "react";
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
import { Checkbox } from "../../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { formatCurrency, formatNumber } from "../../lib/utils";
import useApiList from "../../hooks/useApiList";
import useActiveStore from "../../hooks/useActiveStore";
import { mapProductFromApi } from "../../lib/mappers";
import api from "../../lib/api";
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Eye,
  Upload,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Video,
} from "lucide-react";

const isVideoUrl = (url) => {
  const value = (url || "").toLowerCase();
  return value.endsWith(".mp4") || value.endsWith(".webm") || value.endsWith(".mov") || value.includes("youtube.com") || value.includes("youtu.be") || value.includes("vimeo.com");
};

const getStockBadge = (status, stock) => {
  const styles = {
    active: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    low_stock: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
    out_of_stock: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  };

  const labels = {
    active: `In Stock (${stock})`,
    low_stock: `Low Stock (${stock})`,
    out_of_stock: "Out of Stock",
  };

  return (
    <Badge variant="secondary" className={styles[status]}>
      {labels[status]}
    </Badge>
  );
};

const buildProductPayload = (form, storeId, currentProduct) => {
  const price = Number(form.price || 0);
  const stock = Number(form.stock || 0);
  const base = currentProduct?.raw || {};
  const mediaItems = [];
  (form.imageUrls || []).forEach((url, index) => {
    if (!url?.trim()) return;
    mediaItems.push({
      id: base.media?.find((m) => (m.url || "").trim() === url.trim())?.id,
      url: url.trim(),
      sortOrder: index,
    });
  });
  if (form.videoUrl?.trim()) {
    mediaItems.push({
      id: base.media?.find((m) => (m.url || "").trim() === form.videoUrl.trim())?.id,
      url: form.videoUrl.trim(),
      sortOrder: mediaItems.length,
    });
  }

  return {
    ...base,
    id: currentProduct?.id || base.id,
    storeId,
    title: form.name.trim(),
    description: form.description.trim() || null,
    sku: form.sku.trim() || null,
    price,
    compareAtPrice: form.comparePrice ? Number(form.comparePrice) : null,
    currency: "INR",
    status: 1,
    isPublished: true,
    variants: [
      {
        id: base.variants?.[0]?.id,
        sku: form.sku.trim() || null,
        price,
        quantity: stock,
        attributesJson: null,
        isDefault: true,
      },
    ],
    media: mediaItems,
  };
};

const AddProductDialog = ({ open, onOpenChange, onSubmit, initialValues, loading, mode }) => {
  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    price: "",
    comparePrice: "",
    stock: "",
    imageUrls: [""],
    videoUrl: "",
  });

  useEffect(() => {
    if (!open) return;
    const sortedMedia = [...(initialValues?.raw?.media || [])].sort(
      (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
    );
    const imageUrls = sortedMedia
      .map((m) => m.url || "")
      .filter((url) => url && !isVideoUrl(url));
    const videoUrl = sortedMedia
      .map((m) => m.url || "")
      .find((url) => isVideoUrl(url)) || "";
    setForm({
      name: initialValues?.name || "",
      sku: initialValues?.sku === "-" ? "" : initialValues?.sku || "",
      description: initialValues?.raw?.description || "",
      price: initialValues?.price != null ? String(initialValues.price) : "",
      comparePrice:
        initialValues?.raw?.compareAtPrice != null
          ? String(initialValues.raw.compareAtPrice)
          : "",
      stock: initialValues?.stock != null ? String(initialValues.stock) : "",
      imageUrls: imageUrls.length ? imageUrls : [""],
      videoUrl,
    });
  }, [open, initialValues]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    await onSubmit(form);
  };

  const setImageAt = (index, value) => {
    setForm((prev) => {
      const next = [...prev.imageUrls];
      next[index] = value;
      return { ...prev, imageUrls: next };
    });
  };

  const addImageField = () => {
    setForm((prev) => ({ ...prev, imageUrls: [...prev.imageUrls, ""] }));
  };

  const removeImageField = (index) => {
    setForm((prev) => {
      const next = prev.imageUrls.filter((_, idx) => idx !== index);
      return { ...prev, imageUrls: next.length ? next : [""] };
    });
  };

  const moveImage = (from, to) => {
    setForm((prev) => {
      const arr = [...prev.imageUrls];
      if (to < 0 || to >= arr.length) return prev;
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return { ...prev, imageUrls: arr };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Product" : "Add New Product"}</DialogTitle>
          <DialogDescription>
            Fill in the details to {mode === "edit" ? "update" : "add"} a product.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Premium Wireless Headphones"
                data-testid="product-name-input"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  placeholder="e.g., WH-PRO-001"
                  data-testid="product-sku-input"
                  value={form.sku}
                  onChange={(e) => setField("sku", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select>
                  <SelectTrigger data-testid="product-category-select">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="fashion">Fashion</SelectItem>
                    <SelectItem value="home">Home & Living</SelectItem>
                    <SelectItem value="beauty">Beauty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your product..."
                  rows={4}
                  data-testid="product-description-input"
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                />
              </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-900 dark:text-white">Pricing</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="0.00"
                  data-testid="product-price-input"
                  value={form.price}
                  onChange={(e) => setField("price", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="compare_price">Compare at Price (₹)</Label>
                <Input
                  id="compare_price"
                  type="number"
                  placeholder="0.00"
                  data-testid="product-compare-price-input"
                  value={form.comparePrice}
                  onChange={(e) => setField("comparePrice", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-900 dark:text-white">Inventory</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Stock Quantity</Label>
                <Input
                  id="stock"
                  type="number"
                  placeholder="0"
                  data-testid="product-stock-input"
                  value={form.stock}
                  onChange={(e) => setField("stock", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="low_stock">Low Stock Alert</Label>
                <Input id="low_stock" type="number" placeholder="10" data-testid="product-low-stock-input" />
              </div>
            </div>
          </div>

          {/* Media Management */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-900 dark:text-white">Media Management</h4>
            <p className="text-xs text-slate-500">Add multiple image URLs, drag-reorder or use arrows, optional video URL, and preview assets.</p>
            <div className="space-y-2">
              {form.imageUrls.map((url, idx) => (
                <div
                  key={`img-${idx}`}
                  className="flex items-center gap-2"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", String(idx))}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const from = Number(e.dataTransfer.getData("text/plain"));
                    if (!Number.isNaN(from)) moveImage(from, idx);
                  }}
                >
                  <GripVertical className="w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="https://example.com/image.jpg"
                    data-testid={idx === 0 ? "product-image-input" : undefined}
                    value={url}
                    onChange={(e) => setImageAt(idx, e.target.value)}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => moveImage(idx, idx - 1)}><ArrowUp className="w-4 h-4" /></Button>
                  <Button type="button" variant="outline" size="icon" onClick={() => moveImage(idx, idx + 1)}><ArrowDown className="w-4 h-4" /></Button>
                  <Button type="button" variant="outline" size="icon" onClick={() => removeImageField(idx)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addImageField}>
                <ImagePlus className="w-4 h-4 mr-2" /> Add Image
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="video_url">Optional Video URL</Label>
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-slate-400" />
                <Input
                  id="video_url"
                  placeholder="https://example.com/product.mp4 or YouTube/Vimeo URL"
                  value={form.videoUrl}
                  onChange={(e) => setField("videoUrl", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {form.imageUrls.filter(Boolean).map((url, idx) => (
                <div key={`preview-${idx}`} className="border rounded-lg p-2">
                  <p className="text-[11px] text-slate-500 mb-1">Image {idx + 1}</p>
                  <img src={url} alt={`preview-${idx}`} className="h-24 w-full object-cover rounded bg-slate-100" />
                </div>
              ))}
              {form.videoUrl ? (
                <div className="border rounded-lg p-2">
                  <p className="text-[11px] text-slate-500 mb-1">Video</p>
                  {isVideoUrl(form.videoUrl) && !form.videoUrl.includes("youtube") && !form.videoUrl.includes("vimeo") ? (
                    <video src={form.videoUrl} controls className="h-24 w-full rounded bg-slate-100" />
                  ) : (
                    <a href={form.videoUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">Open video link</a>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="save-product-btn"
            onClick={handleSubmit}
            disabled={loading || !form.name.trim() || !form.price}
          >
            {loading ? "Saving..." : mode === "edit" ? "Update Product" : "Add Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const Products = () => {
  const { storeId, loadingStores } = useActiveStore();
  const importFileRef = useRef(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [editingProduct, setEditingProduct] = useState(null);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importJob, setImportJob] = useState(null);
  const [importStatus, setImportStatus] = useState("");
  const { data: apiProducts, loading } = useApiList("/products", { storeId, enabled: !!storeId });
  const products = rows;

  useEffect(() => {
    setRows((apiProducts ?? []).map(mapProductFromApi));
  }, [apiProducts]);

  const filteredProducts = products.filter(
    (product) =>
      (product.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.sku || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map((p) => p.id));
    }
  };

  const toggleSelect = (id) => {
    if (selectedProducts.includes(id)) {
      setSelectedProducts(selectedProducts.filter((p) => p !== id));
    } else {
      setSelectedProducts([...selectedProducts, id]);
    }
  };

  const openCreateDialog = () => {
    setDialogMode("create");
    setEditingProduct(null);
    setError("");
    setDialogOpen(true);
  };

  const openEditDialog = (product) => {
    setDialogMode("edit");
    setEditingProduct(product);
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async (form) => {
    if (!storeId) return;
    setSaving(true);
    setError("");
    try {
      const payload = buildProductPayload(form, storeId, editingProduct);
      if (dialogMode === "edit" && editingProduct) {
        const res = await api.put(`/products/${editingProduct.id}`, payload);
        const updated = mapProductFromApi(res.data);
        setRows((prev) => prev.map((p) => (p.id === editingProduct.id ? updated : p)));
      } else {
        const res = await api.post("/products", payload);
        setRows((prev) => [mapProductFromApi(res.data), ...prev]);
      }
      setDialogOpen(false);
    } catch (_) {
      setError("Could not save product. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!storeId) return;
    try {
      await api.delete(`/products/${productId}`, { params: { storeId } });
      setRows((prev) => prev.filter((p) => p.id !== productId));
    } catch (_) {
      setError("Could not delete product. Please try again.");
    }
  };

  const pollImportJob = async (jobId) => {
    try {
      const res = await api.get(`/products/import/jobs/${jobId}`);
      const job = res.data;
      setImportJob(job);
      if (job.status === "completed" || job.status === "partial" || job.status === "failed") {
        setImporting(false);
        setImportStatus(`Import ${job.status}. Success: ${job.successCount}, Errors: ${job.errors?.length || 0}`);
        if (job.successCount > 0) {
          const refreshed = await api.get("/products", { params: { storeId } });
          setRows((refreshed.data ?? []).map(mapProductFromApi));
        }
        return;
      }
      setTimeout(() => pollImportJob(jobId), 1500);
    } catch (_) {
      setImporting(false);
      setImportStatus("Import status fetch failed.");
    }
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !storeId) return;
    setError("");
    setImporting(true);
    setImportStatus("Uploading import file...");
    setImportJob(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/products/import/csv", formData, {
        params: { storeId },
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportStatus("Import started. Processing rows...");
      await pollImportJob(res.data.jobId);
    } catch (_) {
      setImporting(false);
      setImportStatus("Import failed to start.");
    } finally {
      if (event.target) event.target.value = "";
    }
  };

  return (
    <div className="space-y-6" data-testid="products-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Products</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Manage your product catalog
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={importFileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button
            variant="outline"
            className="rounded-lg"
            data-testid="import-btn"
            disabled={!storeId || importing}
            onClick={() => importFileRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            {importing ? "Importing..." : "Import CSV"}
          </Button>
          <Button
            className="rounded-lg bg-blue-600 hover:bg-blue-700"
            onClick={openCreateDialog}
            data-testid="add-product-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search products..."
                className="pl-9 rounded-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="search-products"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-40 rounded-lg" data-testid="filter-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="electronics">Electronics</SelectItem>
                <SelectItem value="fashion">Fashion</SelectItem>
                <SelectItem value="home">Home & Living</SelectItem>
                <SelectItem value="beauty">Beauty</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-40 rounded-lg" data-testid="filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-0">
          {loadingStores || loading ? (
            <div className="p-6 text-sm text-slate-500 dark:text-slate-400">Loading products...</div>
          ) : !storeId ? (
            <div className="p-6 text-sm text-amber-600 dark:text-amber-400">Store is not selected. Set `REACT_APP_STORE_ID` or login with a store role.</div>
          ) : null}
          {error ? <div className="px-6 py-3 text-sm text-red-600 dark:text-red-400">{error}</div> : null}
          {importStatus ? <div className="px-6 py-3 text-sm text-blue-700 dark:text-blue-300 border-b border-slate-200 dark:border-slate-800">{importStatus}</div> : null}
          {importJob?.errors?.length ? (
            <div className="px-6 py-3 text-xs text-amber-700 dark:text-amber-300 border-b border-slate-200 dark:border-slate-800 max-h-36 overflow-auto">
              {importJob.errors.slice(0, 10).map((item, idx) => (
                <div key={`${item.row}-${idx}`}>Row {item.row}: {item.error}</div>
              ))}
              {importJob.errors.length > 10 ? <div>+{importJob.errors.length - 10} more errors</div> : null}
            </div>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                    onCheckedChange={toggleSelectAll}
                    data-testid="select-all-products"
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Sales</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow
                  key={product.id}
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  data-testid={`product-row-${product.id}`}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedProducts.includes(product.id)}
                      onCheckedChange={() => toggleSelect(product.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                      />
                      <span className="font-medium text-slate-900 dark:text-white">
                        {product.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-slate-500 dark:text-slate-400">
                      {product.sku}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800">
                      {product.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(product.price)}
                  </TableCell>
                  <TableCell>{getStockBadge(product.status, product.stock)}</TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400">
                    {formatNumber(product.sales)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`product-actions-${product.id}`}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="cursor-pointer">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => openEditDialog(product)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer text-red-600 dark:text-red-400" onClick={() => handleDelete(product.id)}>
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

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-4 border-t border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing {filteredProducts.length} of {products.length} products
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-lg" disabled>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                1
              </Button>
              <Button variant="outline" size="sm" className="rounded-lg">
                2
              </Button>
              <Button variant="outline" size="sm" className="rounded-lg">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AddProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSave}
        initialValues={editingProduct}
        loading={saving}
        mode={dialogMode}
      />
    </div>
  );
};

export default Products;
