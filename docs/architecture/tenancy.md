# Tenancy & company model

## Current state (single-tenant)

The application is currently **single-tenant with no authentication**. The
"company" is a **backend singleton**:

- `GET /company` resolves the only company via `repository.find()` and returns
  **HTTP 404** when none exists.
- `PATCH /company` (`UpdateCompanyUseCase`) is an **upsert**: it creates the
  company on the first save.

Because there is no auth yet, "no known account" is modelled as **"no company
row in the database"**.

## First-run detection (frontend)

The frontend gates the first-run experience with a single helper:

- `companyNeedsSetup(company)` in `apps/front/src/data/company.ts` — today it is
  `!company.id`.
- `LoginPage` routes "Entrar" to `/onboarding` when setup is needed, else to
  `/projects`.
- `CompanyGuard` (inside `AppLayout` → `CompanyProvider`) redirects app routes to
  `/onboarding` while the company is missing.
- `/onboarding` is a standalone 3-step wizard (company / contact / address) that
  saves via `updateCompany` (the upsert) and then enters `/projects`.

Keep `companyNeedsSetup` as the **single source of truth** for "is this a first
run" — it is the one place to change when tenancy arrives.

## Planned multi-tenant evolution (deferred to the auth phase)

Multi-user is intentionally deferred to the future auth work. The impact:

- **Low cost for the existing UI** (entry screen + onboarding): the only change
  is turning the "is there a company?" check from a global singleton into a
  per-user/tenant check.
- **The real, unavoidable work** is backend tenancy: add a `companyId`/tenant
  reference to documents, projects, suppliers and extraction hints, and scope
  every query by it. `repository.find()` becomes `findByUserId` / `findByTenant`.

This is expected regardless of how onboarding is built, so building onboarding
now does not increase that future cost.
