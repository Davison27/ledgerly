# Tenancy & company model

## Current state (single-tenant, now with real authentication)

The application is **single-tenant, but no longer unauthenticated**: real
Google login, sessions and a permission-per-member matrix landed with the
`auth` context (`apps/back/src/contexts/auth/`, see
`docs/architecture/auth.md`). Authentication and tenancy are orthogonal, and
that separation was deliberate (`company` stays a singleton on purpose, see
below) — landing one does not imply landing the other. The "company" is still
a **backend singleton**, shared by every authenticated workspace member:

- `GET /company` resolves the only company via `repository.find()` and returns
  **HTTP 404** when none exists. It is now `@Authenticated()` (it returns
  `taxId`, `email`, `phone`, `address`, which can't be public); logged-out
  requests get `401` before they ever reach the singleton logic.
- `GET /company/branding` is a separate `@Public()` route with exactly three
  fields (`name`, `logo`, `brandColor`) so the unauthenticated login screen
  can still paint the logo without exposing the rest — see the "public
  branding route" section in `docs/architecture/auth.md`.
- `PATCH /company` (`UpdateCompanyUseCase`) is still an **upsert**: it creates
  the company on the first save, and now requires `@RequiresAdmin()`.

"No known account" is no longer modelled as "no company row" — there is a
real account model now (`WorkspaceMember`). What is still modelled as "no
company row in the database" is **"no company profile filled in yet for this
instance"**, which is a separate, later gate (see below).

## Two first-run gates, not one

Before auth, there was a single first-run check. Now there are **two**, in
order, and they answer different questions:

1. **Is this instance configured at all?** — `GET /api/auth/status` returns
   `bootstrapNeeded: true` until the first administrator has been created
   (`BootstrapFirstAdminUseCase`, gated by `BOOTSTRAP_ADMIN_EMAIL` and a
   Postgres partial unique index, see `docs/architecture/auth.md`).
   `LoginPage` (`pages/login/ui/page/LoginPage.tsx`) resolves this via
   `useLoginPage` and shows the bootstrap form instead of "Continue with
   Google" while it's true.
2. **Does the (already authenticated) instance have a company profile yet?**
   — the pre-existing check, unchanged in shape:
   - `companyNeedsSetup(company)` in
     `apps/front/src/entities/company/model/company.ts` — still `!company.id`.
   - `CompanyGuard` (inside `AppLayout`,
     `apps/front/src/widgets/app-layout/ui/layout/AppLayout.tsx`) redirects
     app routes to `/onboarding` while the company is missing.
   - `/onboarding` is a standalone 3-step wizard (company / contact / address)
     that saves via `updateCompany` (the upsert) and then enters `/dashboard`.
     It now requires a session (`SessionGuard` wraps it in
     `app/router/router.tsx`), functionally unchanged otherwise.

`SessionGuard` (`widgets/app-layout/ui/layout/SessionGuard.tsx`, see
`docs/architecture/auth.md`) is the outer gate and always runs first;
`CompanyGuard` is the inner one and only ever sees authenticated requests.
Keep `companyNeedsSetup` as the **single source of truth** for "does this
instance have a company profile" — it is still the one place to change if
that check ever needs to become per-tenant.

## Multi-tenant: still deferred, now for its own sake

The "auth phase" this file used to point to as the place multi-tenant would
land **has happened**, and it deliberately did not bring `companyId` with it
(`D7` in `docs/plans/autenticacion-google.md`: "`company` sigue siendo
singleton. Ningún `companyId` en firmas ni rutas"). What auth actually
delivered is **real accounts and per-member authorization** — who can log in
and what module of the same shared company they can see or edit — which was
the prerequisite this file used to be waiting on for "per-user/tenant check"
below. It was not a prerequisite for splitting the company data itself into
tenants; that remains its own, still-unstarted piece of work:

- **Low cost for the existing UI** (entry screens + onboarding): the only
  change would be turning the "is there a company?" check from a global
  singleton into a per-tenant check.
- **The real, unavoidable work** is backend tenancy: add a `companyId`/tenant
  reference to documents, projects, suppliers and extraction hints, and scope
  every query by it. `repository.find()` becomes `findByTenant`.

This is expected regardless of how auth or onboarding were built, so landing
either did not increase or decrease that future cost.
