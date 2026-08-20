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
  list: () =>
    queryOptions({
      queryKey: ['projects', 'list'] as const,
      queryFn: fetchProjects,
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
| `projectQueries`                                      | `['projects', 'list']`, `['projects', 'detail', id]`                               |                                                                                                |
| `supplierQueries`, `productQueries`, `invoiceQueries` | `['suppliers', 'list']`, `['products', 'list']`, `['invoices', 'list']`            |                                                                                                |
| `extractionHintQueries`                               | `['extraction-hints', 'list']`, `['extraction-hints', 'quality']`                  |                                                                                                |
| `staffQueries`                                        | Lists, details, and documents under `['staff', ...]`                               |                                                                                                |
| `staffDocumentTypeQueries`                            | `['staff-document-types']`                                                         | Runtime-constant catalogue.                                                                    |
| `documentQueries`                                     | Lists, project documents, details, and duplicate checks under `['documents', ...]` |                                                                                                |
| `scheduleQueries`                                     | Board, events, and schedulable projects under `['schedule', ...]`                  |                                                                                                |
| `dashboardQueries`                                    | `['dashboard', 'company', year ?? null]`                                           | Page aggregate; not exported outside the dashboard.                                            |
| `notificationQueries`                                 | `['notifications', 'unread-count']`, `['notifications', 'list', size]`             | The unread count refetches every five minutes; the list is an infinite query opened on demand. |
| `workspaceMemberQueries`                              | `['workspace-members', ...]`                                                       | Uses the authenticated workspace-member API.                                                   |
| `integrationQueries`                                  | `['integrations', 'list']`                                                         | Uses in-memory fixtures; see `docs/architecture/workspace.md`.                                 |

The `all` key is always the root for its domain and is the standard target for
invalidations that must refresh every variation of that domain.

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
| Project create, update, delete, or settings change  | `projectQueries.all`                                         |
| Project-document change                             | `documentQueries.all` and `projectQueries.all`               |
| Supplier, product, staff, or extraction-hint change | Its respective `all` key                                     |
| Invoice create or delete                            | `invoiceQueries.all` and `documentQueries.all`               |
| Staff document change                               | `staffQueries.all` and `documentQueries.all` when applicable |
| Calendar event or assignment change                 | `scheduleQueries.all`                                        |
| Company settings or onboarding completion           | `companyQueries.singleton().queryKey`                        |
| Notification state change                           | `notificationQueries.all`                                    |
| Workspace member or integration change              | Its respective `all` key                                     |

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
