# Testing

Ledgerly uses unit, integration, API, database, and browser tests to check
different parts of the product. A passing suite covers its assertions; it does
not prove the absence of every defect.

## Regression contract

End-to-end specs and their expected results already on `main` form an
append-only baseline. Do not edit, delete, rename, skip, or weaken that
baseline without David's explicit approval. Add coverage in new, focused specs
with small composable fixtures. A spec becomes part of the protected baseline
when its PR merges into `main`; it can be corrected while its original PR is
still open.

Fixtures, test-server configuration, runners, Compose files, scanner and auth
fixtures, suite discovery, package scripts, and local verification hooks can
change what a test proves. Preserve existing assertions when changing these
support files. CODEOWNERS review protects them along with the specs. Do not add
a contributor-controlled label, checkbox, or flag as an exception to the
baseline policy.

## Suite boundaries

- **Unit and integration:** Exercise isolated rules and adapters using the existing
  test runners.
- **Backend HTTP E2E:** Exercise authenticated and unauthenticated HTTP
  contracts against the real Nest application.
- **Database E2E:** Use a disposable PostgreSQL instance to apply migrations to
  fresh and populated legacy schemas, verify preserved records, rerun
  migrations, and check entity/schema parity. The Better Auth upgrade
  regression includes a populated legacy account with required `issuer`, not
  only an empty database.
- **Browser E2E:** Exercise built frontend assets through the same-origin HTTPS
  route to the real API and a disposable PostgreSQL instance. Do not substitute
  `vite preview`, test-only authentication routes, or a developer database.

Browser coverage follows the current router and permission guards:

- **Authentication and setup** (`/`, `/onboarding`): Verify session handling
  and persisted company setup. `/changelog` reads an actual shipped release and
  verifies its acknowledgement. Google OAuth initiation and invalid callback
  behavior may be tested locally, but the external identity-provider exchange
  is outside this suite. Restricted members are denied onboarding through both
  the route and company-update API.
- **Dashboard, clients, and projects** (`/dashboard`, `/companies`,
  `/companies/:clientId/projects`, `/projects`, `/projects/:projectId`): Verify
  dashboard-view access and the denied route/API boundary, the redirect, all six
  project sections, and mutations after reload or an API read.
- **Operations** (`/calendar`, `/documents`, `/extraction-hints`, `/suppliers`,
  `/equipment`, `/staff`, `/staff/:staffMemberId`): Cover all four staff
  sections, permission boundaries, and persisted changes. Seed and delete a
  synthetic extraction hint, verify it is gone after reload, and deny the route
  and API to members without Documents access.
  The staff Documents tab is currently “Coming soon”; browser coverage asserts
  its placeholder state, and persisted staff-document upload/read is unsupported
  and not covered.
- **Workspace and planning** (`/workspace`, `/planning`): Verify supported
  singleton company and member changes without adding `companyId`. Exercise
  planning-template create, edit, and delete, then apply a template from
  project settings and verify the checklist persists. The integrations tab is
  a local in-memory prototype; assert its current UI without claiming server
  persistence or inventing an API.
- **Shared shell:** Check English and Spanish route landmarks, language and
  theme persistence, notifications, command palette navigation, and visibility
  rules across roles.

For every route pattern and nested section or tab, assert the route's visible
landmark in both supported locales. Critical writes should be checked after a
reload or through the API. Exercise role boundaries in both the browser and
API, as well as relevant validation and unauthenticated-access failures.

Use synthetic users, records, and files against an isolated local stack. The
browser suite keeps the production malware-scanner adapter enabled and uses a
local ClamAV-protocol fixture to distinguish clean synthetic files from a
synthetic infected marker. This verifies the adapter's request and rejection
path; it does not validate antivirus signatures or malware classification.
The Better Auth session fixture must use the application's real configuration
and prove the session through the real auth endpoints. Do not add a test-only
login route, a second auth configuration, or Better Auth test utilities.

## Local verification

The Husky pre-push hook runs `pnpm verify:push` for every local push without
changed-path filtering. The command must run the supported test, typecheck,
lint, build, migration, browser, and repository checks and stop at the first
failure. Browser and database tests require local Docker Compose and an
installed Playwright Chromium; the hook must not download a browser or use a
remote database automatically.

`HUSKY=0` and `git push --no-verify` can bypass local hooks. GitHub cannot prove
that a local hook ran before a PR is merged, and an authorized repository
owner or administrator can bypass branch rules. Keep GitHub Actions and
required CI status checks out of this workflow; CODEOWNERS review protects
test assets but is not evidence that a local test command ran.
