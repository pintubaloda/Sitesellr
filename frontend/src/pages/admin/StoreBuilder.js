import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { themes } from "../../lib/mock-data";
import {
  Palette,
  Layout,
  Navigation,
  Eye,
  Check,
  Lock,
  Sparkles,
  Monitor,
  Smartphone,
  Tablet,
  Settings,
  Move,
  Type,
  Image,
  Layers,
  PanelLeft,
} from "lucide-react";

const ThemeCard = ({ theme, isActive, onSelect }) => {
  return (
    <Card
      className={`border-2 transition-all cursor-pointer hover:shadow-lg ${
        isActive
          ? "border-blue-600 dark:border-blue-500"
          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
      }`}
      onClick={() => !theme.isPro && onSelect(theme.id)}
      data-testid={`theme-card-${theme.id}`}
    >
      <div className="relative">
        <img
          src={theme.preview}
          alt={theme.name}
          className="w-full h-48 object-cover rounded-t-lg"
        />
        {theme.isPro && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-t-lg">
            <Badge className="bg-gradient-to-r from-purple-600 to-pink-600">
              <Lock className="w-3 h-3 mr-1" />
              PRO
            </Badge>
          </div>
        )}
        {isActive && (
          <div className="absolute top-3 right-3">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-900 dark:text-white">{theme.name}</h3>
          <Badge variant="secondary" className="text-xs">
            {theme.category}
          </Badge>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{theme.description}</p>
      </CardContent>
    </Card>
  );
};

const BuilderSection = ({ title, icon: Icon, children }) => {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-slate-500" />
        <h4 className="font-medium text-slate-900 dark:text-white">{title}</h4>
      </div>
      {children}
    </div>
  );
};

const DraggableBlock = ({ label, icon: Icon }) => {
  return (
    <div
      className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg cursor-move hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      draggable
    >
      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <Move className="w-4 h-4 text-slate-400 ml-auto" />
    </div>
  );
};

export const StoreBuilder = () => {
  const [activeTheme, setActiveTheme] = useState("theme-minimal");
  const [previewDevice, setPreviewDevice] = useState("desktop");

  return (
    <div className="space-y-6" data-testid="store-builder-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Store Builder</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Customize your store's look and feel
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-lg" data-testid="preview-store-btn">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button className="rounded-lg bg-blue-600 hover:bg-blue-700" data-testid="publish-changes-btn">
            <Sparkles className="w-4 h-4 mr-2" />
            Publish Changes
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="themes" className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <TabsTrigger value="themes" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            <Palette className="w-4 h-4 mr-2" />
            Themes
          </TabsTrigger>
          <TabsTrigger value="pages" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            <Layout className="w-4 h-4 mr-2" />
            Pages
          </TabsTrigger>
          <TabsTrigger value="navigation" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            <Navigation className="w-4 h-4 mr-2" />
            Navigation
          </TabsTrigger>
        </TabsList>

        {/* Themes Tab */}
        <TabsContent value="themes" className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Choose a Theme</CardTitle>
              <CardDescription>
                Select a theme that best represents your brand. You can customize colors and fonts later.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {themes.map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    theme={theme}
                    isActive={activeTheme === theme.id}
                    onSelect={setActiveTheme}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pages Tab */}
        <TabsContent value="pages" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Builder Sidebar */}
            <div className="space-y-4">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Page Sections</CardTitle>
                  <CardDescription className="text-xs">
                    Drag and drop sections to build your page
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <DraggableBlock label="Hero Banner" icon={Image} />
                  <DraggableBlock label="Text Block" icon={Type} />
                  <DraggableBlock label="Product Grid" icon={Layers} />
                  <DraggableBlock label="Featured Products" icon={Sparkles} />
                  <DraggableBlock label="Testimonials" icon={PanelLeft} />
                  <DraggableBlock label="Newsletter" icon={Settings} />
                </CardContent>
              </Card>

              <BuilderSection title="Section Settings" icon={Settings}>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Select a section to edit its settings
                </p>
              </BuilderSection>
            </div>

            {/* Preview Area */}
            <div className="lg:col-span-2">
              <Card className="border-slate-200 dark:border-slate-800 h-full">
                <CardHeader className="border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Page Preview</CardTitle>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                      <Button
                        variant={previewDevice === "desktop" ? "default" : "ghost"}
                        size="sm"
                        className="h-8 px-3 rounded-md"
                        onClick={() => setPreviewDevice("desktop")}
                        data-testid="preview-desktop"
                      >
                        <Monitor className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={previewDevice === "tablet" ? "default" : "ghost"}
                        size="sm"
                        className="h-8 px-3 rounded-md"
                        onClick={() => setPreviewDevice("tablet")}
                        data-testid="preview-tablet"
                      >
                        <Tablet className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={previewDevice === "mobile" ? "default" : "ghost"}
                        size="sm"
                        className="h-8 px-3 rounded-md"
                        onClick={() => setPreviewDevice("mobile")}
                        data-testid="preview-mobile"
                      >
                        <Smartphone className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div
                    className={`mx-auto bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden transition-all ${
                      previewDevice === "desktop"
                        ? "w-full"
                        : previewDevice === "tablet"
                        ? "w-[768px] max-w-full"
                        : "w-[375px] max-w-full"
                    }`}
                  >
                    <div className="h-96 flex items-center justify-center text-slate-400">
                      <div className="text-center">
                        <Layout className="w-12 h-12 mx-auto mb-4" />
                        <p>Drag sections here to build your page</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Navigation Tab */}
        <TabsContent value="navigation" className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Navigation Menu</CardTitle>
              <CardDescription>
                Organize your store's navigation menu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {["Home", "Products", "Collections", "About", "Contact"].map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <Move className="w-4 h-4 text-slate-400 cursor-move" />
                      <span className="font-medium text-slate-900 dark:text-white">{item}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{index === 0 ? "/" : `/${item.toLowerCase()}`}</Badge>
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full rounded-xl" data-testid="add-menu-item-btn">
                  Add Menu Item
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StoreBuilder;
