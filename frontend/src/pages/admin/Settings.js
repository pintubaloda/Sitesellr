import { useState } from "react";
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
  const [storeSettings, setStoreSettings] = useState({
    storeName: "My Awesome Store",
    storeEmail: "contact@mystore.com",
    storePhone: "+91 98765 43210",
    storeAddress: "123 MG Road, Bangalore, Karnataka 560001",
    currency: "INR",
    timezone: "Asia/Kolkata",
  });

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

              <div className="flex justify-end">
                <Button className="bg-blue-600 hover:bg-blue-700" data-testid="save-general-settings">
                  <Check className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
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
                  <p className="text-sm text-slate-500">myawesomestore.sitesellr.com</p>
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
              <Button className="bg-blue-600 hover:bg-blue-700" data-testid="invite-member-btn">
                <Plus className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: "Admin User", email: "admin@store.com", role: "Owner", avatar: "Admin" },
                { name: "John Doe", email: "john@store.com", role: "Admin", avatar: "John" },
                { name: "Jane Smith", email: "jane@store.com", role: "Staff", avatar: "Jane" },
              ].map((member) => (
                <div key={member.email} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.avatar}`} />
                      <AvatarFallback>{member.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{member.name}</p>
                      <p className="text-sm text-slate-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{member.role}</Badge>
                    {member.role !== "Owner" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
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
