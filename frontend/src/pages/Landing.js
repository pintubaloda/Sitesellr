import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import { useTheme } from "../context/ThemeContext";
import {
  Store,
  ShoppingCart,
  BarChart3,
  CreditCard,
  Truck,
  Users,
  Palette,
  Zap,
  Shield,
  Globe,
  ArrowRight,
  Check,
  Star,
  Moon,
  Sun,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  IndianRupee,
  Package,
  Headphones,
} from "lucide-react";
import { pricingPlans, testimonials, faqs } from "../lib/mock-data";
import { formatCurrency } from "../lib/utils";

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-200/50 dark:border-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">Sitesellr</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
              Pricing
            </a>
            <a href="#testimonials" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
              Testimonials
            </a>
            <a href="#faq" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
              FAQ
            </a>
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
              data-testid="theme-toggle"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Link to="/auth/login">
              <Button variant="ghost" data-testid="login-btn">Log in</Button>
            </Link>
            <Link to="/onboarding">
              <Button className="rounded-full bg-blue-600 hover:bg-blue-700" data-testid="get-started-btn">
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200 dark:border-slate-800 animate-slide-down">
            <div className="flex flex-col gap-4">
              <a href="#features" className="text-sm font-medium text-slate-600 dark:text-slate-400 py-2">Features</a>
              <a href="#pricing" className="text-sm font-medium text-slate-600 dark:text-slate-400 py-2">Pricing</a>
              <a href="#testimonials" className="text-sm font-medium text-slate-600 dark:text-slate-400 py-2">Testimonials</a>
              <a href="#faq" className="text-sm font-medium text-slate-600 dark:text-slate-400 py-2">FAQ</a>
              <div className="flex gap-2 pt-4">
                <Link to="/auth/login" className="flex-1">
                  <Button variant="outline" className="w-full">Log in</Button>
                </Link>
                <Link to="/onboarding" className="flex-1">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">Get Started</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

const HeroSection = () => {
  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/5 via-indigo-500/5 to-transparent dark:from-blue-600/10 dark:via-indigo-500/10" />
      <div className="absolute top-20 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <div className="text-left">
            <Badge className="mb-6 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100">
              <Sparkles className="w-3 h-3 mr-1" />
              Built for Indian Commerce
            </Badge>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-[1.1] mb-6 animate-fade-in">
              Launch Your{" "}
              <span className="text-gradient">Online Store</span>{" "}
              in Minutes
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed max-w-xl animate-fade-in stagger-1">
              The all-in-one e-commerce platform designed for Indian businesses. 
              GST-ready, COD enabled, and packed with features to help you sell more.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12 animate-fade-in stagger-2">
              <Link to="/onboarding">
                <Button size="lg" className="rounded-full bg-blue-600 hover:bg-blue-700 text-base px-8 h-12 w-full sm:w-auto" data-testid="hero-cta-primary">
                  Start Selling Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/admin">
                <Button size="lg" variant="outline" className="rounded-full text-base px-8 h-12 w-full sm:w-auto" data-testid="hero-cta-secondary">
                  View Demo
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500 dark:text-slate-400 animate-fade-in stagger-3">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span>Free forever plan</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span>GST compliant</span>
              </div>
            </div>
          </div>

          {/* Right Content - Dashboard Preview */}
          <div className="relative animate-fade-in stagger-4">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
              <img
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop"
                alt="Sitesellr Dashboard Preview"
                className="w-full"
              />
              {/* Floating Card */}
              <div className="absolute bottom-4 left-4 right-4 glass rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Today's Revenue</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">₹47,250</p>
                  </div>
                  <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
                    <span>+12.5%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 glass rounded-xl p-3 shadow-lg animate-bounce" style={{ animationDuration: "3s" }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">New Order</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">₹2,499</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 animate-fade-in stagger-5">
          {[
            { value: "10,000+", label: "Active Stores" },
            { value: "₹50Cr+", label: "GMV Processed" },
            { value: "99.9%", label: "Uptime" },
            { value: "4.9/5", label: "User Rating" },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-1">{stat.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FeaturesSection = () => {
  const features = [
    {
      icon: Store,
      title: "Beautiful Storefronts",
      description: "Choose from stunning themes or build custom pages with our drag-drop builder.",
      color: "blue",
    },
    {
      icon: Package,
      title: "Product Management",
      description: "Unlimited products, variants, SKUs, and inventory tracking made simple.",
      color: "indigo",
    },
    {
      icon: CreditCard,
      title: "Payments",
      description: "Accept UPI, cards, net banking, wallets, and COD. All major gateways supported.",
      color: "green",
    },
    {
      icon: Truck,
      title: "Shipping",
      description: "Integrated with Shiprocket, Delhivery, and more. Auto label printing included.",
      color: "orange",
    },
    {
      icon: BarChart3,
      title: "Analytics",
      description: "Real-time dashboards, sales reports, and customer insights to grow faster.",
      color: "purple",
    },
    {
      icon: Users,
      title: "Customer Management",
      description: "Build relationships with customer profiles, segments, and loyalty programs.",
      color: "pink",
    },
    {
      icon: IndianRupee,
      title: "GST Ready",
      description: "Automatic GST invoicing, HSN codes, and tax reports. GSTIN validation built-in.",
      color: "emerald",
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Enterprise-grade security, PCI compliance, and 99.9% uptime guarantee.",
      color: "slate",
    },
  ];

  const colorClasses = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
    green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    pink: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };

  return (
    <section id="features" className="py-20 lg:py-32 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            Features
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            Everything You Need to{" "}
            <span className="text-gradient">Sell Online</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            From inventory to shipping, payments to analytics — we've got you covered with tools built specifically for Indian commerce.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              data-testid={`feature-card-${index}`}
            >
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-xl ${colorClasses[feature.color]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Feature Highlight */}
        <div className="mt-16 grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Built for India, Made for Scale
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              Whether you're selling to 10 customers or 10,000, Sitesellr grows with you. 
              Our platform handles the complexity so you can focus on what matters — your business.
            </p>
            <ul className="space-y-3">
              {[
                "Multi-language support (Hindi, Tamil, Telugu, and more)",
                "WhatsApp Commerce integration",
                "B2B & wholesale pricing support",
                "Multi-store management",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                  <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop"
              alt="E-commerce analytics"
              className="rounded-2xl shadow-xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

const PricingSection = () => {
  return (
    <section id="pricing" className="py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            Pricing
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            Simple, Transparent{" "}
            <span className="text-gradient">Pricing</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Start free, upgrade when you're ready. No hidden fees, no surprises.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {pricingPlans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative border-2 transition-all duration-300 ${
                plan.popular
                  ? "border-blue-600 dark:border-blue-500 shadow-xl scale-105"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
              data-testid={`pricing-card-${plan.id}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white hover:bg-blue-600">
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline justify-center gap-1">
                    {plan.price === 0 ? (
                      <span className="text-4xl font-bold text-slate-900 dark:text-white">Free</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-slate-900 dark:text-white">
                          {formatCurrency(plan.price)}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">{plan.period}</span>
                      </>
                    )}
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                  {plan.limitations.map((limit, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-400 dark:text-slate-500">
                      <X className="w-5 h-5 text-slate-300 dark:text-slate-600 flex-shrink-0 mt-0.5" />
                      {limit}
                    </li>
                  ))}
                </ul>

                <Link to={`/onboarding?plan=${encodeURIComponent(plan.id === "basic" ? "free" : plan.id)}`}>
                <Button
                  className={`w-full rounded-full ${
                    plan.popular
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                  }`}
                  data-testid={`pricing-cta-${plan.id}`}
                >
                  {plan.cta}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="py-20 lg:py-32 bg-slate-50 dark:bg-slate-900/50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            Testimonials
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            Loved by{" "}
            <span className="text-gradient">10,000+ Sellers</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Don't just take our word for it. Here's what our customers have to say.
          </p>
        </div>

        {/* Testimonial Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial) => (
            <Card
              key={testimonial.id}
              className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all duration-300"
              data-testid={`testimonial-${testimonial.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm leading-relaxed">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center gap-3">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700"
                  />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

const FAQSection = () => {
  return (
    <section id="faq" className="py-20 lg:py-32">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            FAQ
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Frequently Asked{" "}
            <span className="text-gradient">Questions</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Got questions? We've got answers.
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4" data-testid="faq-accordion">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="border border-slate-200 dark:border-slate-800 rounded-xl px-6 data-[state=open]:bg-slate-50 dark:data-[state=open]:bg-slate-900/50"
            >
              <AccordionTrigger className="text-left text-slate-900 dark:text-white hover:no-underline py-4">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 dark:text-slate-400 pb-4">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

const CTASection = () => {
  return (
    <section className="py-20 lg:py-32 bg-blue-600 dark:bg-blue-700 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
          Ready to Start Selling?
        </h2>
        <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
          Join 10,000+ Indian businesses already growing with Sitesellr. 
          Set up your store in minutes, not days.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/onboarding">
            <Button
              size="lg"
              className="rounded-full bg-white text-blue-600 hover:bg-blue-50 text-base px-8 h-12"
              data-testid="cta-primary"
            >
              Start Your Free Store
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Button
            size="lg"
            variant="outline"
            className="rounded-full border-white text-white hover:bg-white/10 text-base px-8 h-12"
            data-testid="cta-secondary"
          >
            <Headphones className="w-5 h-5 mr-2" />
            Talk to Sales
          </Button>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-slate-900 dark:bg-slate-950 text-slate-400 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Sitesellr</span>
            </div>
            <p className="text-sm mb-6 max-w-sm">
              The all-in-one e-commerce platform built for Indian businesses. 
              Start selling online in minutes.
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors">
                <Globe className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Themes</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Resources</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm">
            © 2024 Sitesellr. All rights reserved.
          </p>
          <p className="text-sm">
            Made with love in India
          </p>
        </div>
      </div>
    </footer>
  );
};

export const Landing = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Landing;
