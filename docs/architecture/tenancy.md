# Tenancy and company lifecycle

Ledgerly currently has real authenticated workspace members but one shared
company profile. Authentication and tenancy are deliberately separate:
membership determines who may access the installation, while business data is
not yet partitioned by tenant.

## Company singleton

The company context is in `apps/back/src/contexts/company/`. `GET /company`
returns the single company profile to authenticated users; `PATCH /company`
is an administrator-only upsert, so the first saved profile creates the
singleton.

`GET /company/branding` is public and rate-limited. It exposes only `name`,
`logo`, and `brandColor` so the login page can render installation branding
without exposing company contact or tax data. The frontend applies the brand
colour through `buildThemeConfig()`.

Do not add `companyId` to routes, repository signatures, entities, or domain
commands while this model remains in place. The singleton is an architectural
invariant, not an omitted parameter.

## Startup and routing gates

`GET /auth/status` reports whether the instance still needs its first
administrator. The login page uses it to choose between bootstrap and Google
sign-in.

After authentication, `SessionGuard` protects `/onboarding` and the app shell.
`CompanyGuard` inside `AppLayout` then checks
`companyNeedsSetup(company)`. A missing company profile redirects to
`/onboarding`, whose form saves through the company upsert before entering the
application. Keep `companyNeedsSetup()` as the frontend source of truth for
this gate.

## Future multi-tenancy

Multi-tenancy requires a separate migration: a tenant reference on every
company-owned aggregate and query scoping in every repository. It is not
achieved by adding authentication, onboarding, or workspace membership. When
that work is undertaken, replace singleton reads such as `find()` with
tenant-scoped operations consistently across the backend and update the
onboarding gate accordingly.

See `docs/architecture/auth.md` for authentication and member authorization,
and `docs/architecture/workspace.md` for the administrator-facing company UI.
