# Capa de datos (TanStack Query)

## Qué problema resuelve

Antes de esta migración, cada pantalla del front leía datos con
`useState` + `useEffect` + una función de `entities/<x>/api`, sin ninguna caché
por medio. Eso tenía tres costes concretos:

- Con `<StrictMode>` puesto (se queda puesto), cada `GET` salía dos veces en
  desarrollo.
- Volver a una pantalla ya visitada repetía siempre la petición, aunque los
  datos no hubieran cambiado.
- Tras cada mutación había que acordarse de llamar a mano a un `loadX()` para
  refrescar la lista, y ese `loadX()` se repetía, con pequeñas variaciones, en
  cada página.

TanStack Query resuelve los tres con una sola pieza: una caché de queries con
deduplicación de peticiones en vuelo (mata la doble llamada de `StrictMode`
como efecto colateral), invalidación explícita por clave (sustituye a los
`loadX()` manuales) y reutilización entre navegaciones mientras los datos
sigan "frescos".

## Dónde vive el `QueryClient`

`apps/front/src/app/providers/queryClient.ts` exporta la instancia única de
`QueryClient`, montada en `AppProviders.tsx`
(`apps/front/src/app/providers/AppProviders.tsx`) con `<QueryClientProvider>`
por fuera de `BrandColorProvider` y del resto de providers de la app.

```ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, gcTime: 300_000, refetchOnWindowFocus: false, retry: false },
    mutations: { retry: false },
  },
});
```

Por qué esos valores, en una app de gestión interna donde los únicos escritores
de los datos son los propios formularios de esta UI:

- `staleTime: 60_000` — los datos solo cambian desde aquí, y cada escritura
  invalida explícitamente lo que toca. Un minuto de margen basta para que
  navegar entre pantallas reutilice la caché sin pedir de más, y para que el
  doble montaje de `StrictMode` colapse en una sola petición real.
- `gcTime: 300_000` — una pantalla sobrevive en caché a una ida y vuelta
  normal (por ejemplo, entrar en un proyecto y volver a la lista) sin retener
  memoria indefinidamente para pantallas que ya no se visitan.
- `refetchOnWindowFocus: false` — nada de lo que se muestra aquí es tiempo
  real; volver de otra pestaña del navegador no debe disparar peticiones
  nuevas al back.
- `retry: false` — replica el comportamiento anterior (cero reintentos) y es
  imprescindible para que `GET /company` falle rápido y de forma predecible
  cuando el singleton no existe (ver el apartado de `useCompany()` más abajo).

Dos factorías necesitan un comportamiento distinto al de por defecto y lo
declaran en su propia `queryOptions`, no tocando la config global:

- `dashboardQueries.company(year)` usa `staleTime: 0`. El dashboard agrega
  documentos, proyectos, facturas y agenda; refrescarlo entero al montar es
  más simple y más fiable que invalidarlo desde siete flujos de mutación
  distintos, y como sigue habiendo caché de por medio no parpadea.
- `staffDocumentTypeQueries.list()` usa `staleTime: Infinity`. Es un catálogo
  que no cambia en tiempo de ejecución.

## Convenio de factorías de queries

Las queries no se escriben sueltas: cada slice que posee datos remotos
publica una factoría en su segmento `api` (`entities/<x>/api/<x>.queries.ts`,
o `pages/dashboard/api/dashboard.queries.ts` para el dashboard, que es un
agregado de página y no un dato de ninguna entidad). Un objeto por slice con
`all` (la clave raíz, para invalidar por prefijo) y una función por consulta
que devuelve `queryOptions`:

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

El consumidor siempre pasa por la factoría, nunca escribe una `queryKey` a
mano: `useQuery(projectQueries.list())`, o
`useQuery({ ...projectQueries.list(), enabled: open })` cuando la consulta
depende de una condición (una modal abierta, un id opcional). El `queryFn` es
la función de endpoint que ya existía en `api/`, con su mapper de dominio si
lo tiene, ejecutado siempre dentro del propio `queryFn` y nunca en un `select`
inline (rompería la identidad estable del array resultante en cada render).

Claves realmente en el código:

| Factoría | Consulta | `queryKey` | Nota |
|---|---|---|---|
| `companyQueries` (`entities/company/api/company.queries.ts`) | `singleton()` | `['company']` | `staleTime: 300_000`; expone también el hook `useCompany()` (ver D6 más abajo) |
| `projectQueries` (`entities/project/api/project.queries.ts`) | `list()` | `['projects', 'list']` | |
| | `detail(id)` | `['projects', 'detail', id]` | |
| `supplierQueries` (`entities/supplier/api/supplier.queries.ts`) | `list()` | `['suppliers', 'list']` | |
| `productQueries` (`entities/product/api/product.queries.ts`) | `list()` | `['products', 'list']` | |
| `invoiceQueries` (`entities/invoice/api/invoice.queries.ts`) | `list()` | `['invoices', 'list']` | |
| `extractionHintQueries` (`entities/extraction-hint/api/extraction-hint.queries.ts`) | `list()` | `['extraction-hints', 'list']` | |
| | `quality()` | `['extraction-hints', 'quality']` | |
| `staffQueries` (`entities/staff-member/api/staff.queries.ts`) | `list()` | `['staff', 'list']` | |
| | `detail(id)` | `['staff', 'detail', id]` | |
| | `documents(staffMemberId, typeId?)` | `['staff', 'documents', staffMemberId, typeId ?? null]` | |
| `staffDocumentTypeQueries` (mismo fichero) | `list()` | `['staff-document-types']` | `staleTime: Infinity`; coincide con `.all` a propósito, es un catálogo de una sola entrada |
| `documentQueries` (`entities/document/api/document.queries.ts`) | `list(filters)` | `['documents', 'list', filters]` | |
| | `byProject(projectId)` | `['documents', 'project', projectId]` | |
| | `detail(projectId, id)` | `['documents', 'detail', projectId, id]` | |
| | `duplicateCheck(params)` | `['documents', 'duplicate-check', params]` | |
| `scheduleQueries` (`entities/schedule-event/api/schedule.queries.ts`) | `board(from, to)` | `['schedule', 'board', from, to]` | |
| | `events(filter)` | `['schedule', 'events', filter]` | |
| | `schedulableProjects()` | `['schedule', 'schedulable-projects']` | |
| `dashboardQueries` (`pages/dashboard/api/dashboard.queries.ts`) | `company(year?)` | `['dashboard', 'company', year ?? null]` | `staleTime: 0`; único agregado de página, no se exporta a nadie |
| `notificationQueries` (`entities/notification/api/notification.queries.ts`) | `unreadCount()` | `['notifications', 'unread-count']` | `refetchInterval: 5 min`, `refetchOnWindowFocus: true` — ver `docs/architecture/notifications.md` |
| | `list(size)` | `['notifications', 'list', size]` | `infiniteQueryOptions`, solo se pide con el desplegable de la campana abierto |

Cada `all` es la clave raíz de su fila (`['projects']`, `['documents']`, …) y
es lo que reciben las invalidaciones que quieren refrescar todo el dominio.

## Regla M — las mutaciones no pasan a `useMutation`

Los formularios y acciones de borrado conservan sus handlers `async` con su
`try/catch` de siempre, su estado local (`submitting`, `deletingId`) y sus
`message.success` / `message.error`. El único cambio frente al código previo a
la migración es sustituir la llamada manual a `loadX()` por
`await queryClient.invalidateQueries({ queryKey: … })`.

Motivo: convertir estos handlers a `useMutation` habría tocado quince ficheros
distintos para reescribir un manejo de errores (`error instanceof ApiError &&
error.status === 409`, confirmaciones de borrado bloqueado, mensajes por
campo) que ya funcionaba bien. El cambio a invalidación es una línea por
flujo; el resto del handler no se mueve.

## Invalidaciones por flujo

| Flujo | Fichero | Invalida |
|---|---|---|
| Crear / editar / borrar proyecto | `pages/projects/ui/ProjectsPage.tsx` | `projectQueries.all` |
| Editar ajustes de un proyecto | `pages/project-detail/ui/SettingsSection.tsx` | `projectQueries.all` |
| Borrar documento de un proyecto | `pages/project-detail/ui/DocumentsSection.tsx` | `documentQueries.all` + `projectQueries.all` |
| Crear / editar / borrar proveedor | `pages/suppliers/ui/SuppliersPage.tsx` | `supplierQueries.all` |
| Crear / editar / borrar producto | `pages/products/ui/ProductsPage.tsx` | `productQueries.all` |
| Borrar pista de extracción | `pages/extraction-hints/ui/ExtractionHintsPage.tsx` | `extractionHintQueries.all` |
| Crear / borrar factura | `pages/invoices/ui/InvoicesPage.tsx` | `invoiceQueries.all` + `documentQueries.all` (una factura puede generar un apunte) |
| Borrar documento (buscador) | `pages/documents/ui/DocumentsPage.tsx` | `documentQueries.all` + `projectQueries.all` |
| Editar documento | `features/document-detail/ui/DocumentEditModal.tsx` | `documentQueries.all` + `projectQueries.all` |
| Subir documento (proyecto o personal) | `features/upload-document/ui/DocumentUploadModal.tsx` | `documentQueries.all` + `projectQueries.all` |
| Crear proveedor inline (desde la modal de subida) | `features/upload-document/ui/DocumentUploadModal.tsx` | `supplierQueries.all` |
| Crear trabajador inline (desde la modal de subida) | `features/upload-document/ui/DocumentUploadModal.tsx` | `staffQueries.all` |
| Crear / editar / borrar trabajador | `pages/staff/ui/StaffPage.tsx` | `staffQueries.all` |
| Editar perfil de un trabajador | `pages/staff-detail/ui/ProfileSection.tsx` | `staffQueries.all` |
| Borrar documento de un trabajador | `pages/staff-detail/ui/StaffDocumentsSection.tsx` | `staffQueries.all` |
| Subir / editar documento de un trabajador | `pages/staff-detail/ui/StaffDocumentUploadModal.tsx`, `StaffDocumentEditModal.tsx` | `staffQueries.all` + `documentQueries.all` |
| Crear / mover / redimensionar / editar / borrar evento de agenda, asignar personal | `pages/calendar/model/useCalendarBoard.ts` | `scheduleQueries.all` (cubre tablero, eventos y proyectos planificables de una vez) |
| Guardar ajustes de empresa | `features/company-settings/ui/CompanySettingsModal.tsx` | `companyQueries.singleton().queryKey` |
| Completar el asistente de onboarding | `pages/onboarding/ui/OnboardingPage.tsx` | `companyQueries.singleton().queryKey` |
| Cargar datos de demo en onboarding | `pages/onboarding/ui/OnboardingPage.tsx` | `invalidateQueries()` sin filtro — crea datos de todos los dominios a la vez, es el único sitio donde una invalidación total está justificada |
| Marcar un aviso / todos como leídos | `widgets/app-layout/model/useNotificationCenter.ts` | `notificationQueries.all` |

## `useCompany()` y el sentinel `EMPTY_COMPANY`

`companyQueries` es la única factoría que no sigue exactamente D2: además del
objeto de `queryOptions`, `entities/company/api/company.queries.ts` exporta el
hook `useCompany()`:

```ts
export const EMPTY_COMPANY: Company = { id: '', name: '' };

export const companyQueries = {
  all: ['company'] as const,
  singleton: () =>
    queryOptions({
      queryKey: ['company'] as const,
      queryFn: () => fetchCompany().catch(() => EMPTY_COMPANY),
      staleTime: 300_000,
    }),
};

export function useCompany(): { company: Company; isLoading: boolean } {
  const { data, isLoading } = useQuery(companyQueries.singleton());
  return { company: data ?? EMPTY_COMPANY, isLoading };
}
```

El backend responde **404** en `GET /company` cuando el singleton todavía no
existe. El `queryFn` captura ese error (y cualquier otro) y devuelve
`EMPTY_COMPANY` en su lugar, exactamente igual que hacía cada consumidor antes
de la migración. De este sentinel depende `companyNeedsSetup()`
(`!company.id`, ver `docs/architecture/tenancy.md`): si el `queryFn` dejara
escapar el error en vez de convertirlo en `EMPTY_COMPANY`, `CompanyGuard`,
`LoginPage` y `OnboardingPage` dejarían de poder distinguir "todavía no hay
company" de un fallo de red, y la redirección a `/onboarding` se rompería.

Gracias a esta excepción, `AppSider`, `TopBar`, `InvoicesPage` y
`DashboardPage` —que solo necesitan `const { company } = useCompany()`— no
tienen que preocuparse por el 404 ni por estados de error explícitos.
