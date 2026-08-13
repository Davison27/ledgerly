---
name: arquitectura-frontend
description: Feature-Sliced Design (FSD) doctrine for the Ledgerly frontend. Use it when planning or reviewing work in apps/front — layers, slices, segments, import rules, public APIs, and file placement. It defines the mandatory structure and prohibited patterns.
---

# Feature-Sliced Design in the Ledgerly frontend

The canonical reference for planning and reviewing `apps/front`. If a plan
contradicts it, the plan is wrong.

## The rule that governs everything

**A module may only import from strictly lower layers.** Never from its own
layer and never from a higher one.

Everything else follows from this. If you are unsure where a file belongs, ask
who needs to import it: that determines its layer.

## Layers, from top to bottom

```
app       → startup, router, providers, global styles
pages     → one screen = one slice
widgets   → large, self-contained UI blocks reused across pages
features  → reusable product interactions
entities  → business concepts (document, project, invoice, staff member…)
shared    → foundation without business logic: UI kit, HTTP client, utilities
```

`app` and `shared` **have no slices**: they are divided directly into segments,
and their files may import one another freely.

`processes` is **deprecated** in the specification. Do not use it.

There is no need to use all six layers. Do not invent new layers: their
semantics are standardized, and adding one breaks the convention for everyone
who works here afterwards.

## Segments within each slice

| Segment  | Contains                                    |
| -------- | ------------------------------------------- |
| `ui`     | Components, styles, presentation formatting |
| `api`    | Backend calls, response types, mappers      |
| `model`  | Domain types, state, business logic         |
| `lib`    | Utilities used only by that slice           |
| `config` | Constants and feature flags                 |

A slice does not need all of them. Create only the ones you use.

### One subdirectory per component within `ui/` (D-0)

When a slice's `ui/` has **two or more component `.tsx` files**, each one moves
into its own subdirectory inside `ui/`. With only one component it remains flat:
there is nothing to disambiguate. The slice's main component is no exception:
it moves too (`AppLayout` → `ui/layout/`). Pages use `page/` for their root
component, consistently across all `pages` slices.

The subdirectory name is camelCase and a shortened form of the component name —
remove what repeats the slice or artefact type (`Card`, `Chart`, `Section`,
`Modal`, `View`, `Page`). If nothing distinctive remains, camel-case the full
name (`TopBar` → `topBar`). It must never be identical to the file name.

A component's matching `.module.css` moves with it into its subdirectory. A
`.module.css` shared by the entire slice (used by multiple components) remains
at the root of `ui/` — it still follows the D3 proximity rule in
`docs/architecture/styling.md`.

```
widgets/dashboard-charts/ui/
├── kpi/KpiRow.tsx
├── monthly/MonthlyChart.tsx
├── category/CategoryDonut.tsx
├── status/StatusBreakdown.tsx
├── dashboardCharts.module.css
└── …
```

### TanStack Query queries

`queryOptions` factories live in the `api` segment of the slice that owns the
data: `entities/<x>/api/<x>.queries.ts`, exported through the slice's
`index.ts`. Writing a `queryKey` manually outside a factory is forbidden. Page
aggregates (the dashboard is the current case) keep their own factories in
`pages/<x>/api/<x>.queries.ts` and do not export them to anyone else. See the
full detail in `docs/architecture/data-layer.md`.

### Styles: CSS Modules

Every component keeps its `Component.module.css` **next to the file that uses
it** — usually in `ui/`, but the rule is proximity, not a fixed segment: a hook
in `model/` that returns JSX (`useSettingsMenuItems.tsx`) keeps its module next
to it in `model/`. A `.module.css` is not exported through the slice's
`index.ts` or imported from another slice, except for
`@/shared/ui/typography.module.css`.

Use `style={{…}}` only when a value cannot be known before render and varies by
instance (calculated geometry, a series percentage, a colour from data);
everything else belongs in a class. See the complete detail and catalogue of
valid cases in `docs/architecture/styling.md`.

## Public API: each slice's `index.ts`

Every slice exposes an `index.ts` as its **contract**. Its internals can be
reorganized freely as long as the contract holds.

```ts
// entities/document/index.ts
export { StatusTag } from './ui/StatusTag';
export { DirectionTag } from './ui/DirectionTag';
export type { Document } from './model/types';
```

**Never use a wildcard.** `export * from './ui/Comment'` leaks the slice's
internals and turns every future refactor into a breaking change; it also hides
what the actual interface is.

Always import through the slice's `index.ts`, never from its internals:
`from '@/entities/document'`, not `from '@/entities/document/ui/StatusTag'`.

Exception to the preceding rule: in `shared/ui`, use one `index.ts` per
component rather than one huge file, to avoid pulling half of the UI kit into
every import.

Within the same slice, **do not import from its own `index.ts`**: use relative
paths or you will create circular imports.

### Cross-imports between entities: `@x` notation

Two slices in the same layer cannot import one another. When two entities are
genuinely related, use a dedicated public API:

```
entities/document/
  @x/staff-member.ts   ← what entities/staff-member may import
  index.ts             ← public API normal
```

Use it **only in `entities`** and as little as possible. If it appears in more
than two places, the relationship probably belongs in a higher layer
(`features` or `pages`), where FSD says entity relationships must be resolved.

---

## The Ledgerly map

Target structure. Do not improvise another one:

```
apps/front/src/
├── app/
│   ├── providers/        AppProviders and the shared QueryClient
│   ├── router/           router.tsx and routes
│   └── styles/           index.css, tokens.css (variables --lg-*)
├── assets/               static Ledgerly brand assets
├── pages/
│   ├── dashboard/        ui/ + api/
│   ├── documents/
│   ├── projects/
│   ├── project-detail/
│   ├── invoices/
│   ├── products/
│   ├── suppliers/
│   ├── staff/
│   ├── staff-detail/
│   ├── onboarding/
│   ├── login/
│   ├── extraction-hints/
│   ├── calendar/
│   └── workspace/
├── widgets/
│   ├── app-layout/       AppLayout, TopBar, and the sider
│   ├── command-palette/
│   └── dashboard-charts/
├── features/
│   ├── upload-document/  modal shared by projects and staff members
│   ├── document-detail/
│   ├── project-form/
│   └── staff-member-form/
├── entities/
│   ├── document/         api/ model/ ui/
│   ├── project/          core project data
│   ├── project-product/  project/product relationship
│   ├── invoice/          issued invoices
│   ├── product/          product catalogue
│   ├── supplier/         supplier data
│   ├── staff-member/     employee data
│   ├── schedule-event/   calendar data
│   ├── notification/     persisted notices
│   ├── session/          authentication status
│   ├── workspace-member/ application users and permissions
│   ├── integration/      integration prototype data
│   ├── tax-compliance/   tax profiles and monitored sources
│   ├── extraction-hint/  learned invoice extraction hints
│   └── company/          singleton company and branding
└── shared/
    ├── ui/               Amount, Numeric, SemanticTag, PageContainer, EmptyHint,
    │                     typography.module.css
    ├── api/              httpClient, sanitize
    ├── lib/              cross-cutting utilities
    ├── config/           theme tokens and constants
    └── i18n/             configuration and locales
```

### How to choose the layer for something new

1. Does it know nothing about the business (a button, formatter, HTTP client)?
   → `shared`.
2. Is it a business concept and its data (document, invoice)? → `entities`.
3. Is it a user action reused on multiple pages? → `features`.
   **Not everything is a feature**: if it is used on only one page, it belongs
   on that page.
4. Is it a large UI block reused on multiple pages? → `widgets`. If it appears
   only once and is not reused, it belongs to that page.
5. Is it a screen? → `pages`.

Practical promotion rule: **something moves up a layer when a second consumer
needs it**, not before. Creating a `feature` "just in case" is the quick path
to a `features/` directory full of one-use slices.

---

## Logic outside the view

A 400-line page component with state, handlers, effects, and JSX mixed
together is the problem this architecture solves, and merely moving directories
does not fix it.

FSD divides by **segment**: logic lives in `model`, rendering in `ui`.

```
pages/documents/
├── model/useDocumentsPage.ts   state, handlers, effects, derived data
└── ui/DocumentsPage.tsx        receives the hook result and only renders
```

A `ui` component must not contain rules: if it has an `if` that decides a
business concern, that decision belongs in `model` or the `entity`.

---

## Forbidden

| Anti-pattern                                                         | Why                                                                                                             |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Importing from a higher layer                                        | Breaks the fundamental rule; reverses the dependency direction                                                  |
| Importing from another slice in the same layer                       | Couples domains that should move independently; use `@x` or move the relationship up a layer                    |
| Reaching into a slice's internals (`entities/document/ui/StatusTag`) | Bypasses the contract; any internal refactor breaks consumers                                                   |
| `export *` in an `index.ts`                                          | Leaks internals and hides the actual interface                                                                  |
| Importing from the current slice's own `index.ts`                    | Circular imports                                                                                                |
| Creating new layers                                                  | Their semantics are standardized; nobody understands an invented layer                                          |
| A `feature` with one consumer                                        | Ceremony: if only one page uses it, it belongs on that page                                                     |
| Business logic in a `ui` component                                   | `model` exists for that; domain rules belong in `entities`                                                      |
| A global technical drawer (`data/`, `queries/`, `repositories/`)     | Groups by technology instead of domain: precisely what FSD avoids                                               |
| `style={{…}}` for static values                                      | Use a `.module.css` class; `style` is only for values unknown until render (see `docs/architecture/styling.md`) |
| Property-named classes (`.mb12`)                                     | The name must state the element's role (`.kpiLabel`), not the CSS property it applies                           |
| Code comments                                                        | Forbidden throughout the repository. See `CLAUDE.md`                                                            |

---

## Checklist for reviewing a frontend plan or PR

1. Does every import go to a strictly lower layer?
2. Does no slice import from another slice in its own layer?
3. Does every external import go through the slice's `index.ts`, without wildcards?
4. Is logic in `model`, with the `ui` component only rendering?
5. Does every `feature` and `widget` genuinely have more than one consumer?
6. Does anything that knows no business live in `shared` rather than under a page?
7. Do texts pass through i18n in both `es.json` **and** `en.json`?
8. Are there zero comments?
