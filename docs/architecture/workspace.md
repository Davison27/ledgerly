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
  the same company concepts and translation keys. It is separate from the
  external `Client` records shown in the Companies / Empresas directory at
  `/companies`; those records are project parents, not workspace settings or
  tenants.
- **Members** manages real workspace members through `/workspace/members` and
  obtains the active member from `/auth/me`.
- **Integrations** is a frontend prototype. It has no backend context,
  migration, provider connection, OAuth flow, or external request.
- **Tax compliance** configures the tax-compliance context and exposes its
  monitored sources. Tax deadlines are also consumed by the calendar.

The settings menu links directly to these tabs. Keep future workspace tabs in
the router validation, `WorkspaceTab`, and the settings menu together.

## Members and access

`WorkspaceMemberDto` contains an explicit `admin` or `member` role and a
permission matrix for the application modules. Roles are independent of grants:
administrators always have full access, while member access is determined by
the matrix. Do not infer administrator status from a full member matrix or
allow matrix changes to reduce administrator access.

Members have independent `none`, `view`, or `edit` levels for Dashboard,
Projects, Calendar, Documents, Suppliers, Equipment, and Staff. Dashboard is
read-only and rejects `edit`. New invitations keep the existing view-only
matrix by default, which an administrator can change before sending the
invitation. The migration from the previous role model preserves each
non-admin member's effective matrix while mapping them to `member`.

`none` hides a section and denies its direct route and API operations. `view`
permits authorized reads without mutations; `edit` permits the section's
existing create, update, archive, upload, extraction, assignment, and delete
operations. The frontend mirrors these limits for navigation and controls,
while the backend enforces them on every request. Role, permission, and status
changes revoke the affected member's sessions. Members cannot change their own
access, and the last active administrator cannot be demoted or disabled.

Projects covers both the contracting-company directory and its projects; it
does not cover the singleton company profile, which is administrator-only.
Nested resources normally require grants on both the containing section and the
resource section. For example, project documents require Projects and
Documents, and staff documents require Staff and Documents. Reads require
`view` on each section; mutations require `edit` on each section. Equipment
access covers both the catalogue and its nested PDFs, with the same
parent/resource rule for document listing, download, upload, metadata changes,
and deletion.

Calendar editing is a schedule-only capability. `Calendar.edit` permits
creating, changing, and removing schedule events and assigning projects, staff
employees, and equipment, including when those sections are `none` or `view`.
Calendar editor responses include event scheduling data and only IDs and
display names for linked projects, employees, and equipment. These minimal
selectors do not expose their other fields, grant access to their detail routes
or APIs, or permit changing the underlying records. Project, staff, and
equipment records remain governed by their own section grants. Schedule event
dates and assignments do not change project dates, staff employment dates, or
equipment records.

Ordinary calendar board, event, and schedulable-project reads remain
fail-closed: they require both `Calendar.view` and `Projects.view`, and events
linked to a staff or equipment section the member cannot view are omitted.
`Calendar.view` alone does not expose the editor board or its selectors.

Extraction hints follow Documents access. Dashboard summaries omit data from
denied contributing sections. Notifications and the changelog remain available
to active members; notification records, counts, actions, and destinations are
limited to resources whose owning sections the member can view.

The member panel prevents a user from changing their own access and prevents
removing the last administrator. The backend enforces the corresponding rules
as well; do not rely on disabled UI controls for security.

`workspace-member` intentionally names application users separately from
`staff-member`, which represents company employees.

The `DELETE /workspace/members/:id` contract removes application access rather
than physically deleting a membership. The backend disables and persists the
member before revoking Better Auth sessions. `AccessGuard` denies the disabled
member on the next request even when session revocation fails. The membership
row, UUID, unique email, and Google-subject identity remain as the audit actor
for documents, so a reinvite with the same email is a duplicate-member
conflict. Only the existing member status-update flow can reactivate the same
record, preserving its UUID and document history.

## Staff employment and archive lifecycle

`StaffMember.endDate` is the employment end date. It may be set, changed, or
cleared only subject to date validity and ordering. `archivedAt` is the
visibility and deletion-lifecycle state. These fields are independent:
archiving or unarchiving never changes employment dates, and changing an end
date never archives or unarchives the staff member.

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
