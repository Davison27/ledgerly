# Workspace (`/workspace`)

The workspace page is the administrator area for installation settings. Its
frontend page is `apps/front/src/pages/workspace/`; its data slices are
`entities/workspace-member`, `entities/integration`, and
`entities/tax-compliance`.

`WorkspacePage` redirects non-administrators to `/dashboard`. Server-side
workspace-member operations are also protected by `@RequiresAdmin()`, so the
frontend redirect is not the authorization boundary.

## Tabs

The page has four tabs, represented by the `tab` search parameter:

- **Company** edits the singleton company profile, including logo and brand
  colour. It is the canonical settings form; onboarding deliberately reuses
  the same company concepts and translation keys.
- **Members** manages real workspace members through `/workspace/members` and
  obtains the active member from `/auth/me`.
- **Integrations** is a frontend prototype. It has no backend context,
  migration, provider connection, OAuth flow, or external request.
- **Tax compliance** configures the tax-compliance context and exposes its
  monitored sources. Tax deadlines are also consumed by the calendar.

The settings menu links directly to these tabs. Keep future workspace tabs in
the router validation, `WorkspaceTab`, and the settings menu together.

## Members and access

`WorkspaceMemberDto` contains a permission matrix for the application modules and
three levels: `none`, `view`, and `edit`. Roles are presets over that matrix:
`admin`, `editor`, and `viewer`. `resolveRole()` derives the displayed role
from the matrix; a non-matching matrix is `custom`. Do not store a separately
editable role that can drift from the permissions.

The dashboard is view-only, so `moduleSupportsEdit()` rejects `edit` for that
module and `fillMatrix()` preserves that invariant. The UI uses the same
client helpers for interaction, while the backend remains authoritative.
Equipment permissions cover the catalogue and its nested PDF documents:
`view` permits listing and downloading, while `edit` permits catalogue and
document mutations.

The member panel prevents a user from changing their own access and prevents
removing the last administrator. The backend enforces the corresponding rules
as well; do not rely on disabled UI controls for security.

`workspace-member` intentionally names application users separately from
`staff-member`, which represents company employees.

## Staff document scope

New staff-document uploads are intentionally deferred. The staff detail page
keeps a disabled `Coming soon` control, and the backend does not expose a
`POST /staff/:staffMemberId/documents` route. Existing staff-document records
remain available through their authorized list, file, metadata-update, and
delete paths.

Payroll document creation is retired. Historical payroll entries remain
visible in the staff detail view, but the application does not provide a
creation path for new payroll documents.

## Integration prototype

`INTEGRATION_CATALOG` defines supported integration shapes, families,
authentication kinds, and settings fields. `IntegrationDrawer` renders fields
from this catalogue instead of per-provider forms.

`integrations.api.ts` mutates an in-memory fixture store behind
`fakeLatency()`. Connection, disconnection, testing, and settings changes are
visual interactions only and reset on page reload. When a real integrations
context is introduced, replace the API implementation and remove the fixtures
only after confirming nothing else uses `fakeLatency()`.

Integration cards use local Ant Design icons rather than remote brand assets,
so this settings page has no network dependency for its visual identity.

See `docs/architecture/auth.md` for sessions and authorization,
`docs/architecture/tenancy.md` for the company singleton, and
`docs/architecture/data-layer.md` for frontend query and mutation conventions.
