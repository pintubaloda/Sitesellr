# Load Test Plan - Products & Orders

## Tool
- k6 (recommended)

## Baseline scenarios
1. Public storefront listing
   - `GET /api/public/storefront/{subdomain}`
   - 50 VUs, 5 min
2. Product detail/page fetch
   - `GET /api/public/storefront/{subdomain}/pages/{slug}`
   - 30 VUs, 5 min
3. Cart reserve/release
   - `POST /api/public/storefront/{subdomain}/cart/reserve`
   - `POST /api/public/storefront/{subdomain}/cart/release`
   - 20 VUs, 5 min
4. Checkout
   - `POST /api/public/storefront/{subdomain}/checkout`
   - 10 VUs, 5 min

## SLO targets
- p95 < 800ms for listing/detail
- p95 < 1200ms for checkout
- Error rate < 1%

## Pass criteria
- No stock underflow (negative inventory)
- No 5xx spikes
- No cross-tenant data leakage
