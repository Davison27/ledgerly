# Data layer

Ledgerly uses TanStack Query for frontend reads and cache invalidation. Query
logic belongs to the owning Feature-Sliced Design slice, never in page-local
`useEffect` code. This avoids duplicate development requests under
`StrictMode`, reuses fresh data across navigation, and replaces manual reload
functions after mutations.

## Shared client

`apps/front/src/app/providers/queryClient.ts` exports the single
`QueryClient`, mounted by `AppProviders`.

```ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 300_000,
      refetchOnWindowFocus: false,
      retry: false,
    },
    mutations: { retry: false },
  },
});
```

The defaults fit an internal management application: writes originate from
this UI and invalidate affected data explicitly. One minute of freshness
avoids unnecessary navigation refetches, five minutes retains normal
back-navigation data, and disabling focus refetching avoids treating the UI
as a real-time feed. Disabled retries preserve the previous fail-fast
behaviour.

Two queries intentionally differ:

- `dashboardQueries.company(year)` uses `staleTime: 0`. It aggregates several
  domains, so refetching on mount is safer than coordinating invalidation from
  every contributing mutation.
- `staffDocumentTypeQueries.list()` uses `staleTime: Infinity` because it is a
  runtime-constant catalogue.

## Query factories

Each slice with remote data exposes a factory in its `api` segment, normally
`entities/<entity>/api/<entity>.queries.ts`. A factory has an `all` root key
for prefix invalidation and a function per query that returns
`queryOptions`.

```ts
export const projectQueries = {
  all: ['projects'] as const,
  list: (clientId?: string) =>
    queryOptions({
      queryKey: ['projects', 'list', clientId ?? null] as const,
      queryFn: () => fetchProjects(clientId),
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: ['projects', 'detail', id] as const,
      queryFn: () => fetchProject(id),
    }),
};
```

Consumers use the factory, for example `useQuery(projectQueries.list())` or
`useQuery({ ...projectQueries.list(), enabled: open })`. Do not handwrite
query keys in consumers. Endpoint functions, including domain mapping, remain
inside `queryFn`; mapping in an inline `select` would create unstable result
identities on every render.

| Factory                                               | Keys                                                                               | Notes                                                                                          |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `companyQueries`                                      | `['company']`, `['company', 'branding']`                                           | Both use a five-minute stale time. Branding is public; the singleton requires a session.       |
| `sessionQueries`                                      | `['session', 'status']`                                                            | `staleTime: 0`; bootstrap and authenticated state must be current.                             |
| `clientQueries`                                       | `['clients', 'list']`, `['clients', 'detail', clientId]`                            | The list includes archived clients for history and filter choices; active selectors filter them locally. |
| `projectQueries`                                      | `['projects', 'list', clientId ?? null]`, `['projects', 'detail', id]`              | The null variant is the global list; a client ID is a scoped list.                             |
| `supplierQueries`, `equipmentQueries`               | `['suppliers', 'list']`, `['equipment', 'list']`                                 |                                                                                                |
| `equipmentDocumentQueries`                          | `['equipment-documents', equipmentId]`                                           | Nested encrypted PDF metadata and file actions.                                                 |
| `extractionHintQueries`                               | `['extraction-hints', 'list']`, `['extraction-hints', 'quality']`                  |                                                                                                |
| `staffQueries`                                        | Lists, details, and documents under `['staff', ...]`                               |                                                                                                |
| `staffDocumentTypeQueries`                            | `['staff-document-types']`                                                         | Runtime-constant catalogue.                                                                    |
| `documentQueries`                                     | Lists, project documents, details, and duplicate checks under `['documents', ...]` |                                                                                                |
| `scheduleQueries`                                     | Board, events, and schedulable projects under `['schedule', ...]`                  |                                                                                                |
| `dashboardQueries`                                    | `['dashboard', 'company', year ?? null]`                                           | Page aggregate; not exported outside the dashboard.                                            |
| `notificationQueries`                                 | `['notifications', 'unread-count']`, `['notifications', 'list', size]`             | The unread count refetches every five minutes; the list is an infinite query opened on demand. |
| `releaseNoteQueries`                                  | `['release-notes']`, `['release-notes', 'acknowledgement', version]`                | Reads the authenticated member's server-side acknowledgement for a release version.             |
| `workspaceMemberQueries`                              | `['workspace-members', ...]`                                                       | Uses the authenticated workspace-member API.                                                   |
| `integrationQueries`                                  | `['integrations', 'list']`                                                         | Uses in-memory fixtures; see `docs/architecture/workspace.md`.                                 |

The `all` key is always the root for its domain and is the standard target for
invalidations that must refresh every variation of that domain.

The project hierarchy is represented by routes rather than duplicated data:
`/companies` is the client directory, `/companies/$clientId/projects` is a
client-scoped project list, `/projects` redirects to `/companies` for legacy
links, and `/projects/$projectId` remains a stable project deep link. Project
detail reads its persisted client and returns to that client's scoped list; an
unavailable historical parent returns to the directory. Scope changes only the
project list. Project documents, equipment, financials, and schedule sections
remain project-based.

The unscoped project query remains global. Calendar and schedule queries,
equipment inventory and project-equipment queries, dashboard aggregates, and
command-palette project search must continue to consume global data and must
not inherit the current Companies directory selection.

Global document list and page keys include the complete `DocumentListFiltersDto`,
including `clientId` and `projectId`, so filtered and unfiltered results cannot
collide. The backend applies a client filter through the owning project rather
than a document client column. Client and project selections therefore retain
project-based document navigation while allowing archived-client history.

## Mutations and invalidation

Existing form and delete handlers remain `async` functions with their local
loading state, validation, confirmation, and error handling. They do not move
to `useMutation` merely to adopt the cache. After a successful write, replace
the old reload call with the narrowest appropriate invalidation:

```ts
await queryClient.invalidateQueries({ queryKey: projectQueries.all });
```

This preserves established error behaviour while making consistency explicit.
Use root invalidation for the changed domain, and include dependent domains
when the mutation changes their visible state:

| Change                                              | Invalidate                                                   |
| --------------------------------------------------- | ------------------------------------------------------------ |
| Client create or update                              | `clientQueries.all` and `projectQueries.all`                 |
| Client archive, unarchive, or archive-result delete  | `clientQueries.all`, `projectQueries.all`, and `documentQueries.all` |
| Physical client delete                               | `clientQueries.all` and `projectQueries.all`                 |
| Project create, update, delete, unarchive, or reassignment | `projectQueries.all`, `clientQueries.all`, `documentQueries.all`, the project detail key, and the old/new scoped list keys |
| Project-document change                             | `documentQueries.all` and `projectQueries.all`               |
| Supplier, equipment, staff, or extraction-hint change | Its respective `all` key                                   |
| Staff document change                               | `staffQueries.all` and `documentQueries.all` when applicable |
| Calendar event or assignment change                 | `scheduleQueries.all`                                        |
| Company settings or onboarding completion           | `companyQueries.singleton().queryKey`                        |
| Notification state change                           | `notificationQueries.all`                                    |
| Release acknowledgement succeeds                    | `releaseNoteQueries.acknowledgement(version).queryKey`      |
| Workspace member or integration change              | Its respective `all` key                                     |

`releaseNoteQueries.acknowledgement(version)` is consumed by the release notice
mounted once in the authenticated `AppLayout`, using the current version from
the bundled release registry. The server identifies the member from the
authenticated session; the frontend does not send a member ID or keep this
acknowledgement in browser storage. After a successful acknowledgement, the
mutation updates the active query data and invalidates that same version key
so the persisted server state is fetched again.

## Company singleton sentinel

`GET /api/company` returns `404` until the singleton is created. The company
query intentionally turns that result into `EMPTY_COMPANY`:

```ts
export const EMPTY_COMPANY: Company = { id: '', name: '' };

singleton: () =>
  queryOptions({
    queryKey: ['company'] as const,
    queryFn: () => fetchCompany().catch(() => EMPTY_COMPANY),
    staleTime: 300_000,
  }),
```

`companyNeedsSetup()` depends on `!company.id`. Keep this behaviour: guards,
the login page, and onboarding need to distinguish the normal first-run state
from the absence of loaded company data. `useCompany()` centralizes that
contract so consumers can use a stable company value without duplicating 404
handling.

## See also

- `docs/architecture/auth.md` — session and branding queries.
- `docs/architecture/tenancy.md` — company singleton lifecycle.
- `docs/architecture/workspace.md` — real member data and fixture-backed
  integrations.
