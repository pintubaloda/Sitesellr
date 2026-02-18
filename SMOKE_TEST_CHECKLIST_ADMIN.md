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
