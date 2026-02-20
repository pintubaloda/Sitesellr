# Sitesellr Admin Smoke-Test Checklist

## 1) Platform RBAC Admin (`/admin/platform-rbac`)
- [ ] Open page as platform owner; list loads (200 from `GET /api/platform-rbac/users`).
- [ ] Open page as non-platform user; UI shows `you are not authorized` for 403.
- [ ] Assign platform role; verify row updates and audit entry exists.
- [ ] Remove platform role; verify row updates and access changes after re-login.

## 2) Merchants Management (`/admin/merchants`)
- [ ] Merchant list loads and pagination works.
- [ ] Create merchant from UI; verify merchant appears in list.
- [ ] Edit merchant fields; verify persisted after refresh.
- [ ] Delete/disable action respects RBAC and store isolation.

## 3) Merchant Ops (`/admin/merchant-ops`)
- [ ] Lifecycle action `activate/suspend/expire/reactivate/trial` succeeds for valid input.
- [ ] Invalid lifecycle action is rejected with 400 `invalid_action`.
- [ ] Sensitive action with approval enabled creates pending approval.
- [ ] Onboarding profile update persists and appears after reload.
- [ ] Franchise unit add blocks duplicates with conflict.
- [ ] Backoffice assignment validates scope/department/store scope and blocks duplicates.

## 4) Team Management (`/admin/settings` -> Team)
- [ ] Team list loads from `GET /api/stores/{storeId}/team`.
- [ ] Add member with valid role; row appears.
- [ ] Invalid role or invalid email returns 400 and UI message.
- [ ] Invite creates token/link and sends email when SMTP configured.
- [ ] Update member role works; remove works except last owner guard.

## 5) Invite Acceptance (`/auth/accept-invite`)
- [ ] Valid token + password accepts invite and logs in user.
- [ ] Expired/used token returns `invalid_or_expired_invite`.
- [ ] Weak/invalid payload rejected by DTO validation (400).

## 6) Role Templates (`/admin/settings` -> Role Templates)
- [ ] Create template with comma-separated permissions; dedupe is applied.
- [ ] Invalid/empty permissions rejected with 400.
- [ ] Apply template updates member role+permissions.
- [ ] Sensitive template apply creates pending approval record.
- [ ] Delete template removes it from list.

## 7) Audit Logs (`/admin/audit-logs`)
- [ ] List loads with default filter.
- [ ] Filter by action/entity/user/store works.
- [ ] Team/member/lifecycle actions appear with actor and timestamp.

## 8) Core API validation checks (quick Postman/curl pass)
- [ ] `POST /api/merchant-ops/{merchantId}/lifecycle` rejects invalid action.
- [ ] `PUT /api/merchant-ops/{merchantId}/onboarding` rejects invalid pipeline status.
- [ ] `POST /api/stores/{storeId}/role-templates` rejects malformed permission CSV.
- [ ] `POST /api/stores/{storeId}/team` rejects bad email/role.
- [ ] `POST /api/team-invites/accept` rejects short token/password.

## 2026-02-20 Added Smoke Tests (Storefront Engine + Customer Auth Hardening)

### 1) Campaign Template Purchase + Apply
1. Login as store owner/admin.
2. Open Store Builder -> Pages tab -> Campaign Templates.
3. Choose a paid template not yet active and click `Purchase + Apply`.
4. Confirm new sections are inserted into homepage section list.
5. Save layout and verify sections render at `/s/{subdomain}`.

### 2) Customer Register / Verify / Login / Session
1. Open `/s/{subdomain}/login` and switch to register.
2. Register with name/email/phone/password and capture returned OTP (`000000`).
3. Verify email using the security tool panel.
4. Login and confirm authenticated state appears.
5. Load active sessions and revoke one non-current session.

### 3) Forgot/Reset Password
1. In login page security tools, run `Forgot Password`.
2. Capture reset token from API response message.
3. Use reset token + new password.
4. Re-login using new password.

### 4) PLP/PDP Variant by Category
1. In Platform Themes, set `PlpVariantsJson` and `PdpVariantsJson` for active theme.
2. Apply theme in Store Builder.
3. Open category-filtered PLP and check variant layout behavior changes.
4. Open PDP for product category and verify PDP variant selection.

### 5) Campaign Billing Callback/Refund/Chargeback APIs
1. Create purchase via store campaign purchase endpoint.
2. Call payment callback endpoint with `paid/failed/pending` and check subscription `BillingStatus`.
3. Call refund endpoint and confirm status switches to `refunded` + payment event row exists.
4. Call chargeback endpoint and confirm status switches to `chargeback` + event row exists.
