# Authentication and access control

Ledgerly uses Google sign-in through Better Auth and stores application access
rules separately in the `WorkspaceMember` aggregate. Better Auth owns Google
identities, sessions, cookies, and its database tables; the auth context owns
membership, roles, permissions, the initial administrator, and security audit
records.

Relevant code lives in `apps/back/src/lib/auth.ts`,
`apps/back/src/contexts/auth/`, and
`apps/back/src/shared/infrastructure/http/access/`. The frontend integration
is in `apps/front/src/entities/session/`, `apps/front/src/pages/login/`, and
`apps/front/src/shared/api/auth-client.ts`.

## Default deny

`AccessGuard` is the global NestJS guard. A route must explicitly declare one
of `@Public()`, `@Authenticated()`, `@RequiresAdmin()`,
`@RequiresAccess(module, level)`, or `@RequiresNotificationAccess()`. A route
without one of those declarations is rejected with `403` before session
resolution.

```ts
const requirement = this.reflector.getAllAndOverride<AccessRequirement | undefined>(
  ACCESS_REQUIREMENT_KEY,
  [context.getHandler(), context.getClass()],
);

if (!requirement) {
  throw new ForbiddenException();
}
```

This makes a missing decorator visible as an immediate failure instead of a
silent data exposure. Method metadata overrides class metadata, so write
routes can require a higher permission than their controller default.

## HTTP boundary

Production requires exact HTTPS origins for `FRONTEND_URL` and
`BACKEND_PUBLIC_URL`, secure cookies, and `TRUST_PROXY=true`; Express trusts one
proxy hop behind Caddy. Helmet and a default `Cache-Control: no-store` header
run before body parsing. JSON and URL-encoded bodies are limited to 256 KiB,
URL-encoded requests accept at most 100 parameters, and DTO validation
transforms input while rejecting non-whitelisted fields.

CORS permits credentials only from the configured frontend origin. For
`POST`, `PUT`, `PATCH`, and `DELETE`, the global `OriginGuard` also requires an
`Origin` or `Referer` whose origin exactly matches that frontend. Production
validation errors omit detailed messages.

## Sessions and browser protection

Better Auth is configured in `apps/back/src/lib/auth.ts` with Google as the
only enabled sign-in provider. Email-and-password login is disabled. Its
database adapter uses the application Postgres database through Kysely.

- `BETTER_AUTH_SECRET` is required and must be at least 32 characters.
- Sessions expire after 30 minutes without server activity and refresh after
  five minutes of continued use. Refresh responses forward every `Set-Cookie`
  value to the browser so the database and cookie retain the same rolling
  expiry.
- `BetterAuthSessionResolver` enforces an eight-hour absolute lifetime from
  `session.createdAt` for both protected routes and `GET /api/auth/status`.
  Sessions at that limit, with invalid timestamps, or with future creation
  timestamps are signed out and rejected. Resolution failures fail closed.
- A session must be no older than 15 minutes for Better Auth operations that
  require a fresh session.
- Secure cookies are enabled when `COOKIE_SECURE=true`; production validation
  requires that setting.
- CSRF and origin checks remain enabled. `trustedOrigins` contains the exact
  origin derived from `FRONTEND_URL`, and the client includes credentials on
  auth requests.
- OAuth account tokens are encrypted at rest. Automatic account linking is
  disabled, so identities are never linked merely because their emails match.
- For requests passed through `AuthController`, Better Auth reads client IP
  information from the sanitized `x-forwarded-for` header derived from
  Express. Incoming forwarding headers are removed and Better Auth does not
  trust proxy headers directly.

The remaining application API client still attaches `X-CSRF-Token` to unsafe
requests when the legacy `lg_csrf` cookie is available. Better Auth manages its
own authentication cookies and enforces its own CSRF and origin policy for its
endpoints; do not couple application authorization to a particular cookie
name.

The frontend independently protects sensitive data already loaded in memory.
`SessionGuard` hides authenticated content while validating on initial load,
window focus, `pageshow`, and return to a visible document. It locks after 15
minutes without pointer, keyboard, or touch activity and revalidates the server
session every 60 seconds while visible. Wall-clock comparisons detect elapsed
time even when browser timers pause during operating-system sleep.

Locking clears TanStack Query before navigation, attempts server sign-out, and
persists only a timestamp and lock flag. It never stores an authentication
token in browser storage. Local-storage events coordinate locks across tabs;
session storage and an in-memory fail-closed state cover unavailable or failing
storage. Network and server validation failures hide cached data until a later
successful validation. Only an explicit Google sign-in attempt clears the
persisted browser lock.

The Nest `AuthController` hand-off is a narrow public adapter for Better Auth.
It builds the upstream URL from the configured `BACKEND_PUBLIC_URL`, accepts
only the original path and query, removes host and untrusted proxy or
hop-by-hop headers, and supplies the trusted client address from Express. It
preserves repeated request headers and multiple `Set-Cookie` response values.
Authentication failures are returned with a generic message and only a
bounded safe error code when one is present; raw provider errors, stacks, and
request details are not forwarded or logged.

Session creation, revocation, and OAuth account linking are recorded in
`security_audit_logs` with the event, subject identifier,
`{"outcome":"success"}`, and timestamp. The audit metadata does not contain IP
addresses, user agents, tokens, provider/account details, filenames, file
content, or extracted PII. Audit-write failure produces a fixed warning and
does not make sign-in unavailable.

## Membership is the authoritative application boundary

An authenticated Google user is not automatically authorized for Ledgerly.
For every protected request, `AccessGuard` resolves the Better Auth session and
then looks up a `WorkspaceMember` by the authenticated email address. The
membership record, not the existence of a Better Auth session, decides
application access.

- No session returns `401`.
- No member, a disabled member, or insufficient permissions returns `403`.
- An invited member is activated when their authenticated status is resolved.
- Every protected request re-evaluates membership and permissions, so disabling
  a member takes effect on their next request.

Changing a member's permissions or status persists the membership change and
revokes that member's Better Auth sessions through `BetterAuthSessionRevoker`.
Removing a member deletes the membership record before attempting best-effort
session revocation; any remaining authentication session then fails the member
lookup on its next protected request. Neither path relies on cookie expiry to
remove application access. See `docs/architecture/workspace.md` for the
permission matrix and member management rules.

The `equipment` permission covers both the Equipment catalogue and nested
Equipment PDFs. `view` permits `GET /api/equipment`, document listing, and file
download. `edit` is required for Equipment creation, updates, deletion, and
document upload, metadata update, or deletion. Nested document operations
resolve both `equipmentId` and `documentId` so a document cannot be read or
mutated through a different parent Equipment record.

## First administrator

`BOOTSTRAP_ADMIN_EMAIL` is the only address accepted by
`BootstrapFirstAdminUseCase`. `POST /api/auth/bootstrap` creates the founder
as an invited administrator; that person must then complete Google sign-in
with the same email address.

The endpoint returns the same `403 BOOTSTRAP_UNAVAILABLE` response when the
email does not match or a member already exists. The in-memory count prevents
the normal case; Postgres provides the real concurrency guarantee:

```sql
CREATE UNIQUE INDEX "UQ_workspace_members_single_founder"
  ON "workspace_members" ("is_founder") WHERE "is_founder";
```

Never use “the first user to arrive” as the administrator rule. It leaves an
internet-exposed new deployment open to takeover. If the configured founder
email is wrong after bootstrapping, correcting it requires an intentional
database operation; changing the environment variable does not transfer the
founder account.

## Anonymous surface and public branding

The anonymous allowlist is deliberately narrow: the root response, health
checks, `GET /api/auth/status`, `POST /api/auth/bootstrap`, the Better Auth
`/api/auth/*` hand-off, and `GET /api/company/branding`. Every other route must
declare an authenticated or permissioned requirement. The global access guard
rejects routes without an explicit access declaration.

`GET /api/company/branding` is public because the sign-in screen needs a
company name, logo, and brand color before a session exists. `GET /api/company`
remains authenticated because it includes operational company data.

```ts
export interface CompanyBranding {
  name: string;
  logo: string | null;
  brandColor: string | null;
}
```

`CompanyBrandingResponse` is assembled field by field rather than derived from
the authenticated company response. Keep this endpoint limited to exactly
these three fields: every addition creates unauthenticated data exposure. When
the company singleton does not exist, it returns `200` with an empty name and
null branding values so the first-run sign-in screen remains usable.

## Routes and throttling

| Method                        | Route                     | Access                                | Limit                   |
| ----------------------------- | ------------------------- | ------------------------------------- | ----------------------- |
| `GET`                         | `/api/auth/status`        | Public                                | 60/min                  |
| `POST`                        | `/api/auth/bootstrap`     | Public                                | 5/min                   |
| `GET`                         | `/api/auth/me`            | Authenticated                         | 300/min default         |
| `GET`                         | `/api/company/branding`   | Public                                | 60/min                  |
| `GET`/`POST`/`PATCH`/`DELETE` | `/api/workspace/members*` | Administrator                         | 300/min default         |
| `*`                           | `/api/auth/*`             | Public NestJS hand-off to Better Auth | Better Auth rate limits |

Better Auth is mounted through the catch-all handler in `AuthController`.
Client code must use `authClient` for provider sign-in and sign-out rather than
reimplementing its endpoint or cookie protocol. Better Auth uses
database-backed rate limits with a 60/min default. Nest throttling is currently
process-local; distributed throttling remains a deployment follow-up.

## Google avatar proxy

`GET /api/workspace/members/:id/avatar` is administrator-only and proxies the
Google identity image rather than storing it as a Ledgerly file. The proxy
accepts only HTTPS URLs on `lh3.googleusercontent.com` without credentials or a
non-default port, follows at most three redirects manually while reapplying the
allowlist, times out each fetch after five seconds, and reads at most 1 MiB.
The final response must be PNG, JPEG, or WebP and match its format signature;
invalid or unavailable images fail with a generic not-found or gateway error.

## Google Cloud and local setup

Create a **Web application** OAuth client in Google Auth Platform with only
the `openid`, `userinfo.email`, and `userinfo.profile` scopes. Do not add
Calendar, Drive, or Gmail scopes until a feature needs them and encrypted token
storage, retention, and consent requirements have been designed.

For local development, configure the client with:

```text
Authorized JavaScript origin: http://localhost:5173
Authorized redirect URI:     http://localhost:3005/api/auth/callback/google
```

Set these values in `apps/back/.env` before starting the backend:

| Variable                | Local value                              |
| ----------------------- | ---------------------------------------- |
| `BETTER_AUTH_SECRET`    | A random value of at least 32 characters |
| `GOOGLE_CLIENT_ID`      | `<client-id>.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET`  | `<client-secret>`                        |
| `BOOTSTRAP_ADMIN_EMAIL` | The initial administrator's Google email |
| `BACKEND_PUBLIC_URL`    | `http://localhost:3005`                  |
| `COOKIE_SECURE`         | `false`                                  |
| `TRUST_PROXY`           | `false`                                  |

`PORT=3005` and `FRONTEND_URL=http://localhost:5173` are the local defaults.
Run Better Auth migrations with:

```bash
pnpm --filter @ledgerly/back run db:schema
```

Then start the backend, open `http://localhost:5173/`, bootstrap the configured
founder email, and complete Google sign-in. The subsequent company setup is a
separate concern; see `docs/architecture/tenancy.md`.

For production origins, redirect URIs, key management, and environment
management, see `docs/architecture/deployment.md`.

## See also

- `docs/architecture/workspace.md` — workspace membership and permissions.
- `docs/architecture/tenancy.md` — the company singleton and first-run flow.
- `docs/architecture/data-layer.md` — `sessionQueries` and public branding
  queries.
- `docs/architecture/deployment.md` — VPS configuration and operations.
