# Estilos (CSS Modules)

## Qué problema resuelve

Antes de esta migración, `apps/front/src` tenía **556 props `style={{…}}`**
repartidas por 76 ficheros, más 35 usos de una constante `FORM_ITEM_STYLE`
(591 en total). La mayoría no eran estilo real: eran maquetación que antd ya
sabe resolver con props (`Flex gap`, el token `itemMarginBottom` de `Form`,
`block`) escrita a mano fichero a fichero, o valores estáticos (`fontSize: 12`,
`width: 56`) que deberían vivir en una hoja de estilos, no en el JSX. El
resultado era JSX difícil de leer, sin ningún sitio donde cambiar una decisión
visual una sola vez, y sin forma de saber, con solo mirar un componente, qué
`style` inline era ahí intencionado y cuál era simplemente el hábito por
defecto.

Al terminar la migración, `style` solo aparece donde el valor **no se puede
conocer hasta el render**: geometría del calendario, barras y tooltips de
gráficos, color que viene del dato. El criterio exacto es D5, más abajo.

## Por qué CSS Modules y no Tailwind ni antd-style

Decisión de tecnología: **CSS Modules + variables CSS de antd**. Vite ya
soporta `*.module.css` sin configuración adicional y `vite/client` ya declara
sus tipos en `vite-env.d.ts`, así que la migración no añade ninguna
dependencia nueva — tampoco `clsx`: las variantes se resuelven con atributos
`data-*` (D4), no concatenando strings de clases.

- **Tailwind** habría sustituido un problema (JSX con estilo disperso) por
  otro (JSX con listas larguísimas de clases de utilidad) sin resolver el
  motivo real: la falta de un sitio único para cada decisión visual. Además
  habría convivido mal con el sistema de tokens de antd, que ya expone su
  propia escala.
- **antd-style** (`createStyles`) resuelve el mismo problema que CSS Modules
  pero con CSS-in-JS: coste en runtime, una API nueva que aprender y ningún
  beneficio sobre CSS Modules para esta app, que no necesita estilos que
  dependan de props arbitrarias en tiempo de ejecución (eso es justo lo que
  cubre D5 con `style` inline).
- CSS Modules da alcance local por fichero sin herramienta nueva, convive sin
  fricción con las variables `--ant-*` (siguiente apartado) y con las propias
  (`app/styles/tokens.css`), y el resultado es CSS de verdad: cacheable,
  inspeccionable en devtools sin mapear nombres generados.

## Hallazgo: en antd 6 el modo variables CSS viene activado y no se puede apagar

Antes de escribir el primer `.module.css` había que confirmar que las
variables `--ant-*` (`--ant-color-primary`, `--ant-color-border-secondary`…)
existen de verdad en el DOM y se pueden leer desde CSS. En antd 6 el modo
`cssVar` está **activado por defecto** y no se puede desactivar: `useToken`
construye siempre el `cssVar`, y `ThemeConfig['cssVar']` en 6.5 ya solo acepta
`{prefix, key}`, nunca `boolean`.

Verificado renderizando la app: el `<AntdApp>` de
`app/providers/AppProviders.tsx` sale como
`<div class="… ant-app css-var-_R_0_">`, y la hoja inyectada define ahí los
`--ant-*`. Consecuencias prácticas:

- No hace falta tocar `ConfigProvider` para activar nada; las variables ya
  existen.
- Heredan a todo lo que cuelga de `.ant-app`, incluidos los portales de
  `Modal`/`Popover`/`Tooltip`, que llevan la clase en su propia raíz.
- El sufijo (`_R_0_`) sale de `useId` y es estable entre cambios de tema:
  cambiar a modo oscuro o cambiar el color de marca desde ajustes reescribe
  esa misma regla y las variables se actualizan solas, sin recargar.
- Riesgo real y acotado: un componente que se renderice con `createPortal` a
  `document.body` **sin** ningún componente de antd por encima no heredaría
  las variables. Hoy no ocurre en la app — el `DragOverlay` de dnd-kit se
  renderiza dentro del árbol, bajo `.ant-app`.

## El convenio D1–D6

### D1 · Fuente de verdad

- **Tokens de antd** (colores, radios, sombras, alturas de control): en CSS se
  leen como `var(--ant-*)` y **nunca se redeclaran**. El nombre es el
  kebab-case del token: `colorBorderSecondary` → `--ant-color-border-secondary`,
  `borderRadiusLG` → `--ant-border-radius-lg`, `boxShadowSecondary` →
  `--ant-box-shadow-secondary`. Los numéricos ya traen unidad
  (`--ant-border-radius-lg: 8px`).
- **Escala propia** (`SPACE`, `LAYOUT` en `shared/config/theme.ts`): sigue en
  TS porque se sigue pasando como props (`gap={SPACE.md}`,
  `width={LAYOUT.siderWidth}`), y además se publica una vez como variables CSS
  en `app/styles/tokens.css` (`--lg-space-md`, `--lg-topbar-height`…). Son la
  misma escala en dos sintaxis: quien cambia una cambia la otra. No se
  inventan valores nuevos fuera de la escala.
- **Constantes de dominio que alimentan geometría CSS** (por ejemplo
  `HOUR_HEIGHT`, `HOUR_GUTTER_WIDTH`, `HOURS_IN_DAY` de
  `pages/calendar/model/timeGrid.ts`): TS las sigue necesitando para calcular
  posiciones por instancia, así que TS sigue siendo la única fuente. El
  componente que las consume las publica como custom properties en su propia
  raíz (`--hour-height`, `--hour-gutter-width`, `--hours-in-day`) y el CSS las
  lee con `var()`/`calc()`, nunca las repite como literal. Es el mismo patrón
  de custom properties dinámicas que usan `TimeGrid`/`EventBar` para la
  geometría por segmento (ver D5); aquí simplemente el valor es fijo en vez de
  variar por instancia, pero sigue habiendo una sola fuente.
- **Tipografía**: no vive en TS, es D2.

### D2 · Tipografía

`shared/ui/typography.module.css` expone seis clases —`.kpiValue`,
`.kpiValueSm`, `.kpiLabel`, `.cardTitle`, `.caption`, `.numeric`— y se importa
como `import typography from '@/shared/ui/typography.module.css'`. Los
`fontSize: 12` sueltos sobre texto secundario pasan a `.caption` (gana
`line-height: 1.4`). Tamaños que no son de esta escala (11, 13, 16, 18, 20) van
a una clase semántica del módulo del propio componente, no a
`typography.module.css`: esa hoja es solo para los seis papeles reutilizados
de verdad en todo el front.

### D3 · Dónde vive cada `.module.css`

**Junto al fichero que lo usa**, no siempre en el segmento `ui`: la regla real
es de proximidad, no de segmento fijo. El caso típico es un componente en
`ui/` con su `Componente.module.css` al lado
(`pages/calendar/ui/TimeGrid.module.css`), pero hay una excepción legítima:
`widgets/app-layout/model/useSettingsMenuItems.tsx` es un hook en `model/` que
devuelve JSX con iconos (`MenuProps['items']` de antd), y su
`useSettingsMenuItems.module.css` vive a su lado, en `model/`, porque ese es
el fichero que lo consume. Forzarlo a `ui/` habría roto la proximidad sin
ninguna ganancia.

Un módulo compartido por slice
(`pages/calendar/ui/calendar.module.css`) solo si **3 o más** componentes de
ese mismo slice repiten el mismo bloque — hoy ningún slice ha llegado a ese
umbral, cada componente migrado tiene su propio módulo. Nada de ficheros de
utilidades globales fuera de `app/styles/`. Un `.module.css` no se exporta por
el `index.ts` del slice ni se importa desde otro slice — la única excepción es
`@/shared/ui/typography.module.css`, pensado para importarse desde cualquier
sitio.

### D4 · Nombres de clase

camelCase y semánticos: dicen el papel del elemento (`.kpiLabel`,
`.siderHeader`, `.eventBar`, `.filterBar`), nunca la propiedad CSS que aplican
(`.mb12`, `.flex1`). Las variantes condicionales van por atributo de datos, no
concatenando strings de clases:

```tsx
<aside className={styles.sider} data-collapsed={collapsed}>
```

```css
.sider[data-collapsed='true'] { … }
```

### D5 · Cuándo `style` es la herramienta correcta (y se queda)

Solo cuando el valor **no se puede conocer hasta el render y varía por
instancia**. Si una regla mezcla algo estático con algo dinámico, se parte: el
bloque estático va a la clase, la propiedad dinámica se queda inline. Con
**3 o más** propiedades dinámicas en el mismo elemento, se pasan como custom
properties (`style={{ '--bar-width': `${pct}%` }}`) y el módulo las consume
con `var()`, en vez de escribir un objeto `style` grande.

Catálogo real de los 43 `style` supervivientes al terminar la migración,
agrupados por categoría:

**Geometría calculada a partir del dato** — posición o tamaño que depende de
un cálculo por instancia (horario de un evento, número de columnas de una
semana, si un tooltip cabe a la izquierda o a la derecha):
- `pages/calendar/ui/TimeGrid.tsx` — `top`/`height`/`left`/`width` de cada
  segmento horario, vía custom properties (`--segment-top`, etc.) más el punto
  del indicador de "ahora".
- `pages/calendar/ui/EventBar.tsx` — `--bar-bg`/`--bar-color`/`--bar-border-color`
  calculados a partir del color del proyecto y del estado de arrastre.
- `pages/calendar/ui/WeekRow.tsx` — alto de fila, `gridAutoRows`,
  `gridColumn`/`gridRow` de cada barra: dependen de cuántas barras hay y en
  qué columnas caen esa semana.
- `features/project-form/ui/ProjectFormFields.tsx` — `--swatch-color` del
  selector de color de proyecto.
- `entities/staff-member/ui/StaffAvatar.tsx` — `fontSize` proporcional al
  `size` recibido por prop.
- `widgets/app-layout/ui/AppSider.tsx` — ancho/alto del contenedor del
  logotipo, que se pasa como prop `size`.

**Porcentaje o posición derivados de una serie** — el resultado de dividir un
valor entre un máximo, distinto en cada render con datos distintos:
- `widgets/dashboard-charts/ui/CashflowByStatus.tsx`,
  `widgets/dashboard-charts/ui/TopIssuers.tsx`,
  `pages/dashboard/ui/TopProjectsCard.tsx` — ancho de barra,
  `${(valor / max) * 100}%`.
- `widgets/dashboard-charts/ui/CumulativeProfitChart.tsx`,
  `widgets/dashboard-charts/ui/MonthlyChart.tsx`,
  `pages/dashboard/ui/CashflowForecastCard.tsx`,
  `widgets/dashboard-charts/ui/MonthlyProfitChart.tsx` — posición
  `left`/`top` de un tooltip sobre un SVG, calculada a partir del punto que
  tiene el foco.

**Color que viene del dato** — color de proyecto, tono semántico de un
importe o un estado; no es un token de tema, es un valor por fila/instancia:
- `pages/calendar/ui/SchedulableProjectCard.tsx`,
  `pages/calendar/ui/CalendarDragPreview.tsx`,
  `pages/calendar/ui/DerivedRangeBar.tsx`,
  `pages/project-detail/ui/ProjectDetailPage.tsx`,
  `pages/projects/ui/ProjectCard.tsx`,
  `pages/staff-detail/ui/AgendaEventCard.tsx` — color de proyecto resuelto en
  tiempo de ejecución (`resolveProjectColor`).
- `widgets/dashboard-charts/ui/CategoryDonut.tsx`,
  `widgets/dashboard-charts/ui/StatusBreakdown.tsx`,
  `widgets/dashboard-charts/ui/TopIssuers.tsx`,
  `widgets/dashboard-charts/ui/MonthlyChart.tsx`,
  `pages/dashboard/ui/VatByQuarterCard.tsx` — anillo de donut (gradiente
  cónico calculado) y muestras de leyenda, un color por serie/categoría.
- `widgets/dashboard-charts/ui/KpiRow.tsx`,
  `widgets/dashboard-charts/ui/MonthlyChart.tsx`,
  `pages/dashboard/ui/BudgetVsActualCard.tsx`,
  `pages/dashboard/ui/KpiCard.tsx` — color según si un importe es favorable,
  desfavorable o excede presupuesto; sale de `useSemanticColors`, que depende
  del modo claro/oscuro y se deriva en TS (no se duplica en CSS, ver
  "Descartado" más abajo).
- `apps/front/src/shared/ui/SemanticTag/SemanticTag.tsx` — `color`/`background`
  según el `tone` recibido por prop.
- `entities/staff-member/ui/StaffAvatar.tsx` — color de fondo por trabajador
  (`seedColor`, determinista a partir del id).
- `pages/login/ui/LoginPage.tsx` — degradado del panel de marca, construido
  con el color primario del tema y el color de marca elegido por el usuario en
  ajustes: no se puede fijar en CSS porque el usuario lo cambia en tiempo de
  ejecución.

### D6 · Partes internas de componentes antd

Los sitios que usaban la API de slots `styles={{ body: … }}` pasan a
`classNames={{ body: styles.x }}`: `Modal`, `Card` y `Drawer` aceptan
`classNames` con los mismos slots en antd 6.5. Para partes sin slot propio
(por ejemplo el margen de los `Form.Item` de un formulario denso) se admite
`:global(.ant-form-item)` **dentro** de una clase del módulo, nunca a pelo en
el JSX.

## Descartado

- **Exponer la paleta semántica (`useSemanticColors`) como variables CSS.**
  Depende del modo claro/oscuro y se deriva en TS; solo la usan los `style`
  catalogados arriba en "color que viene del dato". Duplicarla en CSS habría
  creado la misma doble fuente de verdad que esta migración vino a eliminar.
- **`clsx`.** Las variantes de clase se resuelven con atributos `data-*`
  (D4), no concatenando strings.
- **Tailwind / antd-style.** Ver el apartado de arriba.

## Verificación

```bash
pnpm --filter @ledgerly/front lint
pnpm --filter @ledgerly/front build
rg -c -g '*.tsx' 'style=\{\{|style=\{[A-Z_]+\}' apps/front/src | awk -F: '{s+=$2} END {print s}'
```

- Ningún `.module.css` aparece en un `index.ts` de slice, y ningún import de
  un `.module.css` cruza de slice, salvo `@/shared/ui/typography.module.css`.
- Cero comentarios en `.module.css`: `rg -n '/\*|//' apps/front/src --glob '*.module.css'`
  no devuelve nada.
- Cada `style` superviviente debe encajar en una de las tres categorías de D5.
  Si no encaja en ninguna, es deuda: extraer el bloque estático a una clase o,
  si son 3+ propiedades dinámicas, pasarlas a custom properties.
