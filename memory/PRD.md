# Sitesellr - E-commerce Platform PRD

## Original Problem Statement
Build a Shopify-like e-commerce platform called Sitesellr with complete UI including:
- Modern landing page
- Complete admin dashboard
- User/customer management
- Settings and configuration pages
- Multiple frontend theme support

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (ready for implementation)
- **Database**: MongoDB (ready for implementation)
- **Routing**: React Router DOM v7

## What's Been Implemented (Feb 17, 2024)

### Landing Page
- Hero section with CTAs and trust indicators
- Features section (8 feature cards in bento grid)
- Pricing section (3 plans: Basic, Pro, Enterprise)
- Testimonials section (4 customer reviews)
- FAQ section (6 questions with accordion)
- Footer with navigation links

### Auth Pages
- Login page (split-screen layout with testimonial)
- Register page (with password strength indicator)
- Social login buttons (Google, Microsoft)

### Admin Dashboard
- Overview with 4 stat cards (Revenue, Orders, Customers, Conversion Rate)
- Revenue overview chart (Area chart)
- Sales by category chart (Pie chart)
- Recent orders table
- Activity feed

### Products Management
- Products list with table view
- Search and filter by category/status
- Add product dialog
- Product actions (View, Edit, Duplicate, Delete)

### Orders Management
- Orders list with status badges
- Order details dialog
- Search and filter functionality
- Quick stats (Total, Pending, Processing, Delivered)

### Customers Management
- Customer list with segmentation (VIP, Regular, New)
- Customer stats overview
- Search and filter

### Store Builder
- Theme selection (6 themes: 3 free, 3 pro)
- Page builder UI (drag-drop sections)
- Navigation menu editor
- Device preview (Desktop, Tablet, Mobile)

### Marketing
- Discount codes management
- Create discount dialog
- Usage tracking

### Analytics
- Traffic metrics (Visitors, Page Views, Conversion Rate, AOV)
- Revenue trends chart
- Traffic overview chart
- Sales by category breakdown
- Top products list

### Settings
- General settings (Store info, Logo, Domain)
- Payment methods (Razorpay, COD, PayU)
- Shipping zones and partners
- GST/Tax settings
- Email notifications config
- Team management
- API keys

### Theme System
- Light/Dark mode toggle
- CSS variables for theming
- Consistent design across all pages

## User Personas
1. **Merchant/Store Owner**: Main user managing their online store
2. **Admin/Staff**: Team members with role-based access
3. **Customer**: End users shopping on the storefront

## Core Requirements (Static)
- Multi-tenant architecture ready
- GST compliant invoicing
- COD support
- Mobile-first responsive design
- Role-based access control (RBAC)

## P0 Features (Implemented - UI Only)
- [x] Landing page
- [x] Auth pages (Login/Register)
- [x] Admin dashboard
- [x] Products management UI
- [x] Orders management UI
- [x] Customers management UI
- [x] Store builder UI
- [x] Marketing/Discounts UI
- [x] Analytics UI
- [x] Settings UI
- [x] Theme switching

## P1 Features (Next Phase - Backend Integration)
- [ ] User authentication with JWT
- [ ] CRUD operations for Products
- [ ] CRUD operations for Orders
- [ ] Customer management backend
- [ ] Payment gateway integration (Razorpay)
- [ ] File upload for product images

## P2 Features (Future)
- [ ] Storefront for customers
- [ ] Checkout flow
- [ ] Shipping integration
- [ ] Email notifications
- [ ] WhatsApp commerce
- [ ] Multi-store support

## Prioritized Backlog
1. Backend API implementation for Products
2. Backend API implementation for Orders
3. User authentication system
4. Razorpay payment integration
5. Customer storefront
6. Checkout flow

## Tech Stack
- React 19
- React Router DOM 7
- Tailwind CSS 3.4
- Shadcn UI components
- Recharts for charts
- Lucide React for icons
- Framer Motion for animations
- FastAPI (backend)
- MongoDB (database)
