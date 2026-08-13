# Styling

Ledgerly uses CSS Modules with Ant Design 6 tokens. Styles are scoped by
default, require no additional runtime dependency, and remain compatible with
the Ant Design theme and its runtime brand colour.

## Sources of truth

- `apps/front/src/shared/config/theme.ts` defines Ant Design theme tokens,
  `SPACE`, `LAYOUT`, breakpoints, semantic palettes, and the default brand
  colour.
- `apps/front/src/app/styles/tokens.css` exposes the shared spacing, layout,
  typography, and motion scale to CSS as `--lg-*` custom properties.
- Ant Design tokens are consumed in CSS as `var(--ant-*)`. Do not redeclare
  Ant Design colours, radii, shadows, or control dimensions in local CSS.
- `apps/front/src/shared/ui/typography.module.css` contains only genuinely
  reusable text roles (`kpiValue`, `kpiValueSm`, `kpiLabel`, `cardTitle`,
  `caption`, and `numeric`). Component-specific typography belongs in that
  component's module.

When a value is used both in TypeScript and CSS, keep one TypeScript source
and expose it to CSS through a custom property. Do not duplicate literals.

## CSS Module conventions

Place a `*.module.css` file next to the TSX file that consumes it. A module
may sit in `model/` when the model returns JSX; proximity matters more than a
fixed segment. Do not export CSS Modules through a slice public API or import
them across slices. The shared typography module is the intentional exception.

Use semantic camelCase class names such as `filterBar`, `eventBar`, or
`kpiLabel`, never property-shaped names such as `mb12` or `flex1`. Model
conditional variants with data attributes where practical:

```tsx
<aside className={styles.sider} data-collapsed={collapsed} />
```

```css
.sider[data-collapsed='true'] .label {
  display: none;
}
```

Global styles and global utility rules belong only under `app/styles/`.

## Dynamic styling

Use JSX `style` only for values that are calculated per render and per
instance: calendar geometry, chart coordinates or percentages, and colours
from data. Put static layout and presentation in the CSS Module. If an element
needs three or more dynamic values, pass them as custom properties and consume
them with `var()` in the module rather than building a large inline style
object.

For Ant Design component internals, prefer `classNames` slots such as
`classNames={{ body: styles.body }}`. Use supported component props and theme
tokens before adding local overrides.

## Theme and responsive behaviour

`buildThemeConfig()` derives light and dark themes from the configured brand
colour. Components must use tokens or semantic palette helpers instead of
hard-coded theme colours, so the UI updates when the company brand changes.

Responsive decisions belong in the consuming module. Use the project
breakpoints from `theme.ts` and preserve usable narrow layouts: card bodies
should grow with `flex: 1` rather than rely on `height: 100%`, and vertically
centred layouts must remain safely scrollable on short viewports.

See `docs/architecture/data-layer.md` for frontend query conventions and
`docs/architecture/workspace.md` for company brand configuration.
