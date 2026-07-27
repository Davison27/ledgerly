---
name: arquitectura-frontend
description: Doctrina de Feature-Sliced Design (FSD) para el frontend de Ledgerly. Úsala al planificar o revisar cualquier trabajo en apps/front — capas, slices, segmentos, reglas de import, public API y dónde va cada fichero. Define la estructura obligatoria y lo prohibido.
---

# Feature-Sliced Design en el frontend de Ledgerly

Referencia canónica para planificar y revisar `apps/front`. Si un plan la
contradice, el plan está mal.

## La regla que lo gobierna todo

**Un módulo solo puede importar de capas estrictamente inferiores.** Nunca de su
misma capa, nunca de una superior.

De ahí sale todo lo demás. Si dudas dónde va un fichero, pregúntate quién
necesita importarlo: eso determina su capa.

## Las capas, de arriba abajo

```
app       → arranque, router, providers, estilos globales
pages     → una pantalla = un slice
widgets   → bloques de UI grandes y autónomos, reutilizados en varias páginas
features  → interacciones reutilizables del producto
entities  → conceptos de negocio (documento, proyecto, factura, trabajador…)
shared    → cimiento sin lógica de negocio: kit de UI, cliente HTTP, utilidades
```

`app` y `shared` **no tienen slices**: se dividen directamente en segmentos, y
dentro de ellas los ficheros pueden importarse entre sí libremente.

`processes` está **deprecada** en la especificación. No la uses.

No hace falta usar las seis capas. No inventes capas nuevas: su semántica está
estandarizada y añadir una rompe la convención para todo el que venga después.

## Los segmentos, dentro de cada slice

| Segmento | Qué contiene |
|---|---|
| `ui` | Componentes, estilos, formateo de presentación |
| `api` | Llamadas al backend, tipos de la respuesta, mappers |
| `model` | Tipos de dominio, estado, lógica de negocio |
| `lib` | Utilidades que solo usa ese slice |
| `config` | Constantes y feature flags |

Un slice no necesita todos. Crea solo los que uses.

### Queries de TanStack Query

Las factorías de `queryOptions` viven en el segmento `api` del slice dueño del
dato: `entities/<x>/api/<x>.queries.ts`, exportadas por el `index.ts` del
slice. Prohibido escribir una `queryKey` a mano fuera de una factoría. Los
agregados de página (el dashboard es el caso hoy) llevan las suyas en
`pages/<x>/api/<x>.queries.ts` y no se exportan a nadie más. Detalle completo
en `docs/architecture/data-layer.md`.

### Estilos: CSS Modules

Cada componente lleva su `Componente.module.css` **junto al fichero que lo
usa** — normalmente en `ui/`, pero la regla es de proximidad, no de segmento
fijo: un hook en `model/` que devuelve JSX (`useSettingsMenuItems.tsx`) tiene
su módulo al lado, en `model/`. Un `.module.css` no se exporta por el
`index.ts` del slice ni se importa desde otro slice, salvo
`@/shared/ui/typography.module.css`.

`style={{…}}` solo cuando el valor no se puede conocer hasta el render y
varía por instancia (geometría calculada, porcentaje de una serie, color que
viene del dato); todo lo demás va a una clase. Detalle completo, con el
catálogo de casos legítimos, en `docs/architecture/styling.md`.

## Public API: el `index.ts` de cada slice

Cada slice expone un `index.ts` que es su **contrato**. Lo de dentro se puede
reorganizar libremente mientras el contrato aguante.

```ts
// entities/document/index.ts
export { StatusTag } from './ui/StatusTag';
export { DirectionTag } from './ui/DirectionTag';
export type { Document } from './model/types';
```

**Nunca con comodín.** `export * from './ui/Comment'` filtra los internos del
slice y convierte cualquier refactor futuro en un cambio incompatible; además
oculta cuál es la interfaz real.

Importa siempre por el `index.ts` del slice, nunca metiéndote en sus tripas:
`from '@/entities/document'`, no `from '@/entities/document/ui/StatusTag'`.

Excepción a la regla anterior: en `shared/ui`, un `index.ts` por componente en
vez de uno gigante, para no arrastrar medio kit de UI en cada import.

Dentro de un mismo slice, **no importes desde su propio `index.ts`**: usa rutas
relativas, o acabas con imports circulares.

### Cross-imports entre entities: notación `@x`

Dos slices de la misma capa no pueden importarse. Cuando dos entidades están
genuinamente relacionadas, la salida es un public API dedicado:

```
entities/document/
  @x/staff-member.ts   ← lo que entities/staff-member puede importar
  index.ts             ← public API normal
```

Úsalo **solo en `entities`** y lo mínimo posible. Si aparece en más de dos
sitios, probablemente la relación pertenece a una capa superior (`features` o
`pages`), que es donde FSD dice que se resuelven las relaciones entre entidades.

---

## El mapa de Ledgerly

Estructura destino. No improvises otra:

```
apps/front/src/
├── app/
│   ├── providers/        AppProviders, CompanyProvider, ThemeModeProvider, BrandColorProvider
│   ├── router/           router.tsx y rutas
│   └── styles/           index.css, tokens.css (variables --lg-*)
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
│   └── extraction-hints/
├── widgets/
│   ├── app-layout/       AppLayout, TopBar, el sider
│   └── command-palette/
├── features/
│   ├── upload-document/  la modal compartida entre proyecto y trabajador
│   └── company-settings/
├── entities/
│   ├── document/         api/ model/ ui(StatusTag, DirectionTag)/
│   ├── project/
│   ├── invoice/
│   ├── product/
│   ├── supplier/
│   ├── staff-member/
│   └── company/
└── shared/
    ├── ui/               Amount, Numeric, SemanticTag, PageContainer, EmptyHint,
    │                     typography.module.css
    ├── api/              httpClient, sanitize
    ├── lib/              utilidades transversales
    ├── config/           tokens de tema, constantes
    └── i18n/             configuración y locales
```

### Cómo decidir la capa de algo nuevo

1. ¿No sabe nada del negocio (un botón, un formateador, el cliente HTTP)? →
   `shared`.
2. ¿Es un concepto de negocio y sus datos (documento, factura)? → `entities`.
3. ¿Es una acción del usuario reutilizada en varias páginas? → `features`.
   **No todo es una feature**: si solo se usa en una página, va en esa página.
4. ¿Es un bloque de UI grande reutilizado en varias páginas? → `widgets`. Si solo
   aparece en una y no se reutiliza, pertenece a esa página.
5. ¿Es una pantalla? → `pages`.

Regla práctica de promoción: **algo sube de capa cuando lo necesita un segundo
consumidor**, no antes. Crear una `feature` "por si acaso" es la vía rápida a un
`features/` lleno de slices con un solo uso.

---

## Lógica fuera de la vista

Un componente de página de 400 líneas con estado, handlers, efectos y JSX
mezclados es el problema que esta arquitectura viene a resolver, y mover carpetas
no lo arregla por sí solo.

El reparto en FSD es por **segmento**: la lógica vive en `model`, el renderizado
en `ui`.

```
pages/documents/
├── model/useDocumentsPage.ts   estado, handlers, efectos, datos derivados
└── ui/DocumentsPage.tsx        recibe del hook y solo pinta
```

El componente de `ui` no debe contener reglas: si tiene un `if` que decide algo
de negocio, esa decisión pertenece a `model` o al `entity`.

---

## Prohibido

| Anti-patrón | Por qué |
|---|---|
| Importar de una capa superior | Rompe la regla fundamental; invierte la dirección de dependencias |
| Importar de otro slice de la misma capa | Acopla dominios que deben poder moverse por separado; usa `@x` o sube la relación de capa |
| Entrar en las tripas de un slice (`entities/document/ui/StatusTag`) | Salta el contrato; cualquier refactor interno rompe a los consumidores |
| `export *` en un `index.ts` | Filtra internos y oculta la interfaz real |
| Importar desde el `index.ts` del propio slice | Imports circulares |
| Crear capas nuevas | Su semántica está estandarizada; una capa inventada no la entiende nadie |
| Una `feature` con un solo consumidor | Ceremonia: si solo la usa una página, va en esa página |
| Lógica de negocio en un componente de `ui` | Para eso está `model`; si es regla de dominio, está en `entities` |
| Un cajón técnico global (`data/`, `queries/`, `repositories/`) | Es agrupar por tecnología en vez de por dominio: justo lo que FSD viene a evitar |
| `style={{…}}` para valores estáticos | El sitio es una clase de `.module.css`; `style` es solo para lo que no se puede saber hasta el render (ver `docs/architecture/styling.md`) |
| Clases con nombre de propiedad (`.mb12`) | El nombre debe decir el papel del elemento (`.kpiLabel`), no la propiedad CSS que aplica |
| Comentarios en el código | Prohibidos en todo el repo. Ver `CLAUDE.md` |

---

## Checklist para revisar un plan o un PR de frontend

1. ¿Cada import va hacia una capa estrictamente inferior?
2. ¿Ningún slice importa de otro slice de su misma capa?
3. ¿Todo import externo entra por el `index.ts` del slice, sin comodines?
4. ¿La lógica está en `model` y el componente de `ui` solo pinta?
5. ¿Cada `feature` y cada `widget` tienen de verdad más de un consumidor?
6. ¿Lo que no sabe de negocio está en `shared` y no colgando de una página?
7. ¿Los textos pasan por i18n en `es.json` **y** `en.json`?
8. ¿Cero comentarios?
