import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import {
  Store,
  CreditCard,
  Truck,
  Receipt,
  Bell,
  Users,
  Shield,
  Globe,
  Mail,
  Phone,
  MapPin,
  Upload,
  Check,
  ExternalLink,
  Trash2,
  Plus,
  Key,
} from "lucide-react";
import useActiveStore from "../../hooks/useActiveStore";
import api from "../../lib/api";

const SettingSection = ({ title, description, children }) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      )}
    </div>
    {children}
  </div>
);

export const Settings = () => {
  const { storeId, stores } = useActiveStore();
  const selectedStore = useMemo(
    () => (stores || []).find((store) => store.id === storeId) || null,
    [stores, storeId]
  );
  const [storeSettings, setStoreSettings] = useState({
    storeName: "My Awesome Store",
    storeEmail: "contact@mystore.com",
    storePhone: "+91 98765 43210",
    storeAddress: "123 MG Road, Bangalore, Karnataka 560001",
    currency: "INR",
    timezone: "Asia/Kolkata",
    status: "1",
  });
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [generalMessage, setGeneralMessage] = useState("");
  const [corsOriginsCsv, setCorsOriginsCsv] = useState("");
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamMessage, setTeamMessage] = useState("");
  const [teamError, setTeamError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Staff");
  const [inviteLink, setInviteLink] = useState("");
  const [customRoleNames, setCustomRoleNames] = useState({});
  const [memberPermissions, setMemberPermissions] = useState({});
  const [roleTemplates, setRoleTemplates] = useState([]);
  const [templateName, setTemplateName] = useState("");
  const [templatePermissions, setTemplatePermissions] = useState("");
  const [templateSensitive, setTemplateSensitive] = useState(false);

  useEffect(() => {
    if (!selectedStore) return;
    setStoreSettings((prev) => ({
      ...prev,
      storeName: selectedStore.name || prev.storeName,
      currency: selectedStore.currency || prev.currency,
      timezone: selectedStore.timezone || prev.timezone,
      status: String(selectedStore.status ?? 1),
    }));
  }, [selectedStore]);

  useEffect(() => {
    const loadCorsOrigins = async () => {
      if (!storeId) return;
      try {
        const res = await api.get(`/stores/${storeId}/cors-origins`);
        setCorsOriginsCsv(res.data?.corsOriginsCsv || "");
      } catch {
        setCorsOriginsCsv("");
      }
    };
    loadCorsOrigins();
  }, [storeId]);

  const loadTeamMembers = async () => {
    if (!storeId) return;
    setTeamLoading(true);
    setTeamError("");
    try {
      const res = await api.get(`/stores/${storeId}/team`);
      setTeamMembers(Array.isArray(res.data) ? res.data : []);
      const names = {};
      (Array.isArray(res.data) ? res.data : []).forEach((m) => {
        names[m.userId] = m.customRoleName || "";
      });
      setCustomRoleNames(names);
      const templateRes = await api.get(`/stores/${storeId}/role-templates`);
      setRoleTemplates(Array.isArray(templateRes.data) ? templateRes.data : []);
    } catch (err) {
      setTeamError(err?.response?.status === 403 ? "You are not authorized." : "Could not load team members.");
    } finally {
      setTeamLoading(false);
    }
  };

  useEffect(() => {
    loadTeamMembers();
  }, [storeId]);

  const handleSaveGeneral = async () => {
    const targetStoreId = selectedStore?.id || storeId;
    if (!targetStoreId) {
      setGeneralMessage("Select a store first.");
      return;
    }
    setSavingGeneral(true);
    setGeneralMessage("");
    try {
      const currentStore = selectedStore || (stores || []).find((s) => s.id === targetStoreId) || {};
      await api.put(`/stores/${targetStoreId}`, {
        ...currentStore,
        name: storeSettings.storeName,
        currency: storeSettings.currency,
        timezone: storeSettings.timezone,
        status: Number(storeSettings.status),
      });
      await api.put(`/stores/${targetStoreId}/cors-origins`, { corsOriginsCsv });
      setGeneralMessage("Store settings saved.");
    } catch (_) {
      setGeneralMessage("Could not save store settings.");
    } finally {
      setSavingGeneral(false);
    }
  };

  const inviteMember = async () => {
    if (!storeId || !inviteEmail.trim()) return;
    setTeamError("");
    setTeamMessage("");
    setInviteLink("");
    try {
      const res = await api.post(`/stores/${storeId}/team/invite`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail("");
      setInviteRole("Staff");
      const token = res.data?.token || "";
      setInviteLink(token ? `${window.location.origin}/auth/accept-invite?token=${token}` : "");
      setTeamMessage("Invite created. Share this invite link.");
    } catch (err) {
      setTeamError(err?.response?.status === 403 ? "You are not authorized." : "Could not add member.");
    }
  };

  const updateMemberRole = async (userId, role) => {
    if (!storeId) return;
    setTeamError("");
    try {
      const customRoleName = role === "Custom" ? (customRoleNames[userId] || "").trim() || null : null;
      await api.put(`/stores/${storeId}/team/${userId}`, { role, customRoleName });
      setTeamMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, role, customRoleName } : m)));
    } catch (err) {
      setTeamError(err?.response?.status === 403 ? "You are not authorized." : "Could not update role.");
    }
  };

  const saveMemberPermissions = async (userId) => {
    if (!storeId) return;
    setTeamError("");
    try {
      const permissions = (memberPermissions[userId] || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      await api.put(`/platform/rbac/stores/${storeId}/users/${userId}/permissions`, { permissions });
      setTeamMessage("Custom permissions saved.");
    } catch (err) {
      setTeamError(err?.response?.status === 403 ? "You are not authorized." : "Could not save permissions.");
    }
  };

  const createRoleTemplate = async () => {
    if (!storeId || !templateName.trim() || !templatePermissions.trim()) return;
    setTeamError("");
    try {
      await api.post(`/stores/${storeId}/role-templates`, {
        name: templateName.trim(),
        permissionsCsv: templatePermissions.trim(),
        isSensitive: templateSensitive,
      });
      setTemplateName("");
      setTemplatePermissions("");
      setTemplateSensitive(false);
      await loadTeamMembers();
      setTeamMessage("Role template created.");
    } catch (err) {
      setTeamError(err?.response?.status === 403 ? "You are not authorized." : "Could not create role template.");
    }
  };

  const applyTemplate = async (templateId, userId) => {
    if (!storeId) return;
    setTeamError("");
    try {
      await api.post(`/stores/${storeId}/role-templates/${templateId}/apply/${userId}`);
      await loadTeamMembers();
      setTeamMessage("Template applied.");
    } catch (err) {
      setTeamError(err?.response?.status === 403 ? "You are not authorized." : "Could not apply template.");
    }
  };

  const removeMember = async (userId) => {
    if (!storeId) return;
    setTeamError("");
    try {
      await api.delete(`/stores/${storeId}/team/${userId}`);
      setTeamMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (err) {
      setTeamError(err?.response?.status === 403 ? "You are not authorized." : "Could not remove member.");
    }
  };

  return (
    <div className="space-y-6" data-testid="settings-page">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Manage your store settings and preferences
        </p>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex-wrap h-auto">
          <TabsTrigger value="general" className="rounded-lg">
            <Store className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="payments" className="rounded-lg">
            <CreditCard className="w-4 h-4 mr-2" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="shipping" className="rounded-lg">
            <Truck className="w-4 h-4 mr-2" />
            Shipping
          </TabsTrigger>
          <TabsTrigger value="taxes" className="rounded-lg">
            <Receipt className="w-4 h-4 mr-2" />
            Taxes
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="team" className="rounded-lg">
            <Users className="w-4 h-4 mr-2" />
            Team
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Store Information</CardTitle>
              <CardDescription>Basic information about your store</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Store Logo */}
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20">
                  <AvatarImage src="https://placehold.co/80x80/2563EB/FFFFFF?text=S" />
                  <AvatarFallback className="text-2xl">S</AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" className="mb-2" data-testid="upload-logo-btn">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Logo
                  </Button>
                  <p className="text-xs text-slate-500">PNG, JPG up to 2MB. Recommended: 200x200px</p>
                </div>
              </div>

              <Separator />

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="storeName">Store Name</Label>
                  <Input
                    id="storeName"
                    value={storeSettings.storeName}
                    onChange={(e) => setStoreSettings({ ...storeSettings, storeName: e.target.value })}
                    data-testid="store-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeEmail">Store Email</Label>
                  <Input
                    id="storeEmail"
                    type="email"
                    value={storeSettings.storeEmail}
                    onChange={(e) => setStoreSettings({ ...storeSettings, storeEmail: e.target.value })}
                    data-testid="store-email-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storePhone">Phone Number</Label>
                  <Input
                    id="storePhone"
                    value={storeSettings.storePhone}
                    onChange={(e) => setStoreSettings({ ...storeSettings, storePhone: e.target.value })}
                    data-testid="store-phone-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={storeSettings.currency} onValueChange={(v) => setStoreSettings({ ...storeSettings, currency: v })}>
                    <SelectTrigger data-testid="currency-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
                      <SelectItem value="USD">US Dollar ($)</SelectItem>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeStatus">Store Lifecycle</Label>
                  <Select value={storeSettings.status} onValueChange={(v) => setStoreSettings({ ...storeSettings, status: v })}>
                    <SelectTrigger data-testid="store-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Draft</SelectItem>
                      <SelectItem value="1">Active</SelectItem>
                      <SelectItem value="2">Suspended</SelectItem>
                      <SelectItem value="3">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="storeAddress">Store Address</Label>
                <Textarea
                  id="storeAddress"
                  value={storeSettings.storeAddress}
                  onChange={(e) => setStoreSettings({ ...storeSettings, storeAddress: e.target.value })}
                  rows={3}
                  data-testid="store-address-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Store CORS Allowed Origins (CSV)</Label>
                <Textarea
                  rows={2}
                  value={corsOriginsCsv}
                  onChange={(e) => setCorsOriginsCsv(e.target.value)}
                  placeholder="https://sitesellr-web.onrender.com,https://admin.yourstore.com"
                />
                <p className="text-xs text-slate-500">Add trusted frontend/admin origins for this store.</p>
              </div>

              <div className="flex justify-end">
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="save-general-settings"
                  onClick={handleSaveGeneral}
                  disabled={savingGeneral}
                >
                  <Check className="w-4 h-4 mr-2" />
                  {savingGeneral ? "Saving..." : "Save Changes"}
                </Button>
              </div>
              {generalMessage ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">{generalMessage}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Domain Settings</CardTitle>
              <CardDescription>Manage your store's web address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Current Domain</p>
                  <p className="text-sm text-slate-500">{selectedStore?.subdomain ? `${selectedStore.subdomain}.sitesellr.com` : "Not configured"}</p>
                </div>
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  Active
                </Badge>
              </div>

              <div className="p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Custom Domain</p>
                    <p className="text-sm text-slate-500">Connect your own domain (Pro plan required)</p>
                  </div>
                  <Button variant="outline" data-testid="add-custom-domain">
                    <Globe className="w-4 h-4 mr-2" />
                    Add Domain
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Settings */}
        <TabsContent value="payments" className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Configure payment options for your store</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Razorpay */}
              <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Razorpay</p>
                    <p className="text-sm text-slate-500">UPI, Cards, Net Banking, Wallets</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                    Connected
                  </Badge>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
              </div>

              {/* COD */}
              <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                    <Receipt className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Cash on Delivery</p>
                    <p className="text-sm text-slate-500">Accept cash payments on delivery</p>
                  </div>
                </div>
                <Switch defaultChecked data-testid="cod-switch" />
              </div>

              {/* PayU */}
              <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">PayU</p>
                    <p className="text-sm text-slate-500">Alternative payment gateway</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" data-testid="connect-payu">Connect</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shipping Settings */}
        <TabsContent value="shipping" className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Shipping Partners</CardTitle>
              <CardDescription>Connect shipping providers for automatic fulfillment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: "Shiprocket", desc: "Multi-courier aggregator", connected: true },
                { name: "Delhivery", desc: "Pan-India courier service", connected: false },
                { name: "Bluedart", desc: "Premium express delivery", connected: false },
              ].map((partner) => (
                <div key={partner.name} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Truck className="w-6 h-6 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{partner.name}</p>
                      <p className="text-sm text-slate-500">{partner.desc}</p>
                    </div>
                  </div>
                  {partner.connected ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                      Connected
                    </Badge>
                  ) : (
                    <Button variant="outline" size="sm">Connect</Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Shipping Zones</CardTitle>
              <CardDescription>Configure shipping rates by region</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { zone: "Metro Cities", rate: "Free above ₹500", delivery: "2-3 days" },
                  { zone: "Tier 2 Cities", rate: "₹50", delivery: "4-5 days" },
                  { zone: "Rest of India", rate: "₹100", delivery: "5-7 days" },
                ].map((zone) => (
                  <div key={zone.zone} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{zone.zone}</p>
                      <p className="text-sm text-slate-500">{zone.delivery}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900 dark:text-white">{zone.rate}</p>
                      <Button variant="link" size="sm" className="h-auto p-0 text-blue-600">Edit</Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full" data-testid="add-shipping-zone">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Shipping Zone
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Taxes Settings */}
        <TabsContent value="taxes" className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>GST Settings</CardTitle>
              <CardDescription>Configure GST for Indian tax compliance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Enable GST</p>
                  <p className="text-sm text-slate-500">Add GST to product prices and invoices</p>
                </div>
                <Switch defaultChecked data-testid="enable-gst-switch" />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>GSTIN Number</Label>
                  <Input placeholder="e.g., 27AABCU9603R1ZM" data-testid="gstin-input" />
                </div>
                <div className="space-y-2">
                  <Label>Default Tax Rate</Label>
                  <Select defaultValue="18">
                    <SelectTrigger data-testid="tax-rate-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0% (Exempt)</SelectItem>
                      <SelectItem value="5">5% GST</SelectItem>
                      <SelectItem value="12">12% GST</SelectItem>
                      <SelectItem value="18">18% GST</SelectItem>
                      <SelectItem value="28">28% GST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Include Tax in Prices</p>
                  <p className="text-sm text-slate-500">Display prices with tax included</p>
                </div>
                <Switch data-testid="tax-inclusive-switch" />
              </div>

              <div className="flex justify-end">
                <Button className="bg-blue-600 hover:bg-blue-700" data-testid="save-tax-settings">
                  Save Tax Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Configure when to send email alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { title: "New Order", desc: "When a customer places an order", enabled: true },
                { title: "Order Shipped", desc: "When an order is marked as shipped", enabled: true },
                { title: "Low Stock Alert", desc: "When product stock goes below threshold", enabled: true },
                { title: "New Customer", desc: "When a new customer registers", enabled: false },
                { title: "Payment Failed", desc: "When a payment attempt fails", enabled: true },
              ].map((notification) => (
                <div key={notification.title} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{notification.title}</p>
                    <p className="text-sm text-slate-500">{notification.desc}</p>
                  </div>
                  <Switch defaultChecked={notification.enabled} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Settings */}
        <TabsContent value="team" className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Manage who has access to your store</CardDescription>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700" data-testid="refresh-team-btn" onClick={loadTeamMembers}>
                Refresh
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[1fr_160px_auto]">
                <Input
                  placeholder="Member email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  data-testid="team-email-input"
                />
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger data-testid="team-role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Owner">Owner</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Staff">Staff</SelectItem>
                    <SelectItem value="Custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="bg-blue-600 hover:bg-blue-700" data-testid="invite-member-btn" onClick={inviteMember}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Invite
                </Button>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                <p className="font-medium text-slate-900 dark:text-white">Role Template Builder</p>
                <div className="grid gap-3 md:grid-cols-[220px_1fr_auto_auto]">
                  <Input placeholder="Template name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
                  <Input placeholder="permissions csv" value={templatePermissions} onChange={(e) => setTemplatePermissions(e.target.value)} />
                  <label className="text-sm text-slate-600 flex items-center gap-2">
                    <input type="checkbox" checked={templateSensitive} onChange={(e) => setTemplateSensitive(e.target.checked)} />
                    Sensitive
                  </label>
                  <Button variant="outline" onClick={createRoleTemplate}>Create Template</Button>
                </div>
                <div className="space-y-2">
                  {roleTemplates.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-2">
                      <div>
                        <p className="text-sm font-medium">{t.name}{t.isSensitive ? " (Sensitive)" : ""}</p>
                        <p className="text-xs text-slate-500">{t.permissionsCsv}</p>
                      </div>
                    </div>
                  ))}
                  {roleTemplates.length === 0 ? <p className="text-xs text-slate-500">No templates yet.</p> : null}
                </div>
              </div>

              {teamLoading ? <p className="text-sm text-slate-500">Loading team...</p> : null}
              {teamError ? <p className="text-sm text-red-600">{teamError}</p> : null}
              {teamMessage ? <p className="text-sm text-green-600">{teamMessage}</p> : null}
              {inviteLink ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-xs text-slate-600 mb-1">Invite Link</p>
                  <p className="text-xs break-all text-blue-700">{inviteLink}</p>
                </div>
              ) : null}

              {teamMembers.map((member) => (
                <div key={member.userId} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.email}`} />
                      <AvatarFallback>{(member.email || "?")[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{member.email?.split("@")[0] || "Member"}</p>
                      <p className="text-sm text-slate-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select value={member.role} onValueChange={(value) => updateMemberRole(member.userId, value)}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Owner">Owner</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Staff">Staff</SelectItem>
                        <SelectItem value="Custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    {member.role === "Custom" ? (
                      <div className="flex items-center gap-2">
                        <Input
                          className="h-8 w-40"
                          placeholder="Custom role name"
                          value={customRoleNames[member.userId] || ""}
                          onChange={(e) => setCustomRoleNames((p) => ({ ...p, [member.userId]: e.target.value }))}
                        />
                        <Input
                          className="h-8 w-56"
                          placeholder="permissions csv"
                          value={memberPermissions[member.userId] || ""}
                          onChange={(e) => setMemberPermissions((p) => ({ ...p, [member.userId]: e.target.value }))}
                        />
                        <Button className="h-8" variant="outline" onClick={() => saveMemberPermissions(member.userId)}>
                          Save
                        </Button>
                      </div>
                    ) : null}
                    {roleTemplates.length > 0 ? (
                      <select
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                        onChange={(e) => {
                          if (e.target.value) {
                            applyTemplate(e.target.value, member.userId);
                            e.target.value = "";
                          }
                        }}
                      >
                        <option value="">Apply template</option>
                        {roleTemplates.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    ) : null}
                    {member.role !== "Owner" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => removeMember(member.userId)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {!teamLoading && teamMembers.length === 0 ? (
                <p className="text-sm text-slate-500">No team members found for this store.</p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Manage API access for integrations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Production API Key</p>
                      <p className="text-sm text-slate-500">Created Jan 15, 2024</p>
                    </div>
                  </div>
                  <Badge>Active</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Input value="sk_live_••••••••••••••••" readOnly className="font-mono" />
                  <Button variant="outline" size="sm">Reveal</Button>
                  <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600">Revoke</Button>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4" data-testid="create-api-key">
                <Plus className="w-4 h-4 mr-2" />
                Create New API Key
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
