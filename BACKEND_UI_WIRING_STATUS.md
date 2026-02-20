# Backend ↔ UI Wiring Status

## Fully wired
- Auth login/register/onboarding
- Store builder (themes/settings/layout/nav/pages)
- Public storefront rendering
- Product CRUD basic flows
- Customer CRUD basic flows
- Order CRUD basic flows
- Platform themes
- Platform RBAC pages
- Merchant ops pages

## Newly wired in this pass
- Subscription capabilities API
- Subscription usage API
- Product CSV import job API (backend complete; frontend trigger pending dedicated UI button)
- Stock reserve/release API for checkout safety (backend complete; frontend checkout can call next)

## Partial / pending UI wiring
- Platform billing plans full management page
- Product import monitor UI (job status polling)
- Cart reserve/release explicit call chain in storefront checkout UI
- Category CRUD UI tied to new categories API
