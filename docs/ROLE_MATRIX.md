# Liyu POS Role and Permission Matrix

This matrix reflects current route/UI patterns and checked-in migrations. A UI-hidden control is not security evidence. Database enforcement must be verified on staging after migrations are applied.

## Role assignment

- Effective roles are the primary `profiles.role` plus `profile_roles` assignments where the source path uses the role-aware service.
- The staff detail editor supports additional assignments after account creation through `PATCH /api/management/staff/[id]/roles`.
- Owner can assign manager or operational roles; manager can assign operational roles only. The editor cannot assign an owner role, change the current user's own roles, or remove the primary role.
- Invitations start with one primary role. Combined roles are assigned later by an authorized owner/manager.
- Many routes allow any one role from an allow-list (additive combination). Sensitive exact-role flows can reject a combination: room charge requires roles exactly `['cashier']`.

## Capability matrix

Legend: **Allow** means intended and present in reviewed code. **Deny** means explicit guard found. **Conditional** means allow-list or context dependent. **Staging** means policies/deployment must be verified.

| Capability | Owner | Manager | Cashier | Waiter | Kitchen | Barman | Inventory clerk | Combined-role caution |
|---|---|---|---|---|---|---|---|---|
| Dashboard | Allow | Allow | Compact operations | Compact operations | Kitchen workflow | Bar workflow | Inventory workflow | Navigation is not API authorization |
| Business settings / hotel toggle | Allow | Deny by intended settings route | Deny | Deny | Deny | Deny | Deny | Test settings API, not only controls |
| Staff role management | Allow; operational + manager | Allow; operational only | Deny | Deny | Deny | Deny | Deny | Owner role is not assignable via staff editor |
| Product/category read | Allow | Allow | Operational catalog | Operational catalog | Ticket snapshots | Ticket snapshots | Read for counts | Check RLS role policies staging |
| Product/category/base-price write | Allow | Allow | Deny | Deny | Deny | Deny | Deny | `20261006084459...` must be applied |
| Receive stock / stock ledger | Conditional by route | Conditional by route | Deny by intended inventory role gates | Deny | Deny | Limited to custody-related flows | Allow | Verify each action and its API/RLS boundary |
| Stock count / reconciliation | Management review | Management review | Some operational views | Deny | Custody count if recipient | Custody count if recipient | Inventory count | Custody reconciliation API accepts recipient-role set |
| Issue stock handover | Allow | Allow | Deny | Deny | Deny | Deny | Allow | Tenant/branch/stock checks in issue route/RPC |
| Accept own handover | Own voucher | Own voucher if selected | Own voucher | Own voucher | Own voucher | Own voucher | Own voucher if assigned | Recipient ID must match authenticated user |
| Save/update table order | Allow | Allow | Current route includes cashier read/ops; save rule is waiter/manager/owner | Allow | Deny | Deny | Deny | Waiter does not gain checkout permission merely by combined role |
| Complete/cancel table order | Allow | Allow | Allow | Deny | Deny | Deny | Deny | Ready quantity has additional correction protection |
| View Kitchen KDS | All stations | All stations | Deny | Deny | Kitchen only | Deny | Deny | Combined Kitchen+Bar sees both queues where roles union |
| Update Kitchen KOT | Oversight/state role | Oversight/state role | Deny | Deny | Kitchen station | Deny | Deny | Ready attribution requires station worker role |
| View Bar KDS | All stations | All stations | Deny | Deny | Deny | Bar only | Deny | Same station boundary |
| Update Bar KOT | Oversight/state role | Oversight/state role | Deny | Deny | Deny | Bar station | Deny | Custody shift is attributed at ready |
| POS sale/payment | Allow | Allow | Allow | Deny payment completion | Deny | Role may appear in own operational paths; confirm before enabling cash | Deny | Sale role gates must be tested on direct sync API |
| Room charge | Denied by endpoint allow-list | Denied | **Only exact cashier role** | Denied | Denied | GET validation may be allowed, POST denied | Denied | Any additional assigned role makes cashier-only check fail |
| Open/close monetary shift | Allow | Allow | Allow | Deny | Deny | Deny | Deny | Custody shifts are separate from monetary shifts |
| Reports | Allow | Allow | Shift/self report where route allows | Deny | Deny | Deny | Deny | Scope and RLS need staging check |
| Shift report recipient configuration | Owner/admin path | Route-dependent | Deny | Deny | Deny | Deny | Deny | Check owner per-business recipient isolation |

## Role workflow notes

### Owner

Business setup, staff assignment, catalog/prices, financial review, branch operations and oversight. Owner bypass is route-specific, not a universal database wildcard. Confirm each API and RLS policy.

### Manager

Day-to-day operations, catalog and staff administration within manager rules, reports and oversight. Business-level owner-only settings must remain denied at the API.

### Cashier

Checkout, tender recording, own shift and shift close. Must not change product prices or owner settings. Credit should remain disabled for real balances until debtor identity, outstanding amount, collection and settlement are implemented.

### Waiter

Select products, manage open table orders, and save additions. Waiter-only cannot complete payment or close monetary shifts. Saved orders do not prove a kitchen ticket was physically received; KOT must be checked at the station.

### Kitchen / Barman

See and update only their station's tickets. Marking ready records authenticated preparer and a custody shift. They are not automatically financial cashiers.

### Inventory clerk

Receive and count stock; issue custody vouchers. Product/category retail-price writes are restricted by the role-boundary migration. This role must not complete sales or access cash analytics. Validate all direct endpoints and database policies on staging.

## Required combined-role tests

Use accounts in a staging business and test direct API requests as well as UI:

| Combined assignment | Expected effective abilities | Expected denial / special case |
|---|---|---|
| Waiter + Cashier | Save table orders; perform cashier checkout and shift tasks | Cannot edit menu prices; room charge denied because not exact cashier |
| Waiter + Barman | Save table orders; view/update Bar KDS; accept own custody | No cashier settlement or monetary shift |
| Waiter + Kitchen | Save table orders; view/update Kitchen KDS | No cashier settlement or monetary shift |
| Cashier + Inventory clerk | Only explicitly additive cashier and stock roles | Must not expose owner/manager price/catalog writes; exact room charge denied |
| Manager + operational role | Manager operations plus assigned station/inventory tasks | Owner-only settings remain denied; review route allow lists for privilege intersection |
| Owner + operational role | Owner retains owner actions and may use explicit station views | Owner role assignment itself is not available through staff editor |
| Kitchen + Barman | Both KDS stations | No monetary shift/checkout unless cashier is also explicitly assigned |

Do not infer that every arbitrary combination works correctly just because multiple rows can be stored. Route semantics differ between additive allow lists, privileged-role checks and exact-role checks.

## Deployment-dependent evidence

Migrations `013_rls.sql`, `20261005093000_mvp_role_access_boundaries.sql`, `20261006084459_restrict_pos_financial_ledger_writes.sql`, `20261006092213_hospitality_kot_and_room_folios.sql`, and later custody migrations must be applied and tested in the target project. Source review is not proof of deployed RLS.
