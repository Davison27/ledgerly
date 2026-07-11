# ledgerly-erp

Monorepo gestionado con [Turborepo](https://turborepo.dev/) y pnpm.

## Estructura

```
ledgerly-erp/
├── apps/
│   ├── front/   # React 19 + Vite + TypeScript
│   └── back/    # NestJS 11 + TypeScript
└── packages/    # (código compartido, vacío por ahora)
```

## Requisitos

- Node.js >= 20
- pnpm >= 11

## Puesta en marcha

```bash
pnpm install
```

## Scripts (desde la raíz)

| Comando          | Descripción                             |
| ---------------- | --------------------------------------- |
| `pnpm dev`       | Arranca front y back en modo desarrollo |
| `pnpm build`     | Compila todas las apps                  |
| `pnpm lint`      | Ejecuta ESLint en todo el monorepo      |
| `pnpm typecheck` | Comprueba los tipos                     |
| `pnpm test`      | Ejecuta los tests                       |
| `pnpm format`    | Formatea con Prettier                   |

Para un solo paquete usa el filtro de turbo, p. ej.:

```bash
pnpm dev --filter=@ledgerly/front
pnpm dev --filter=@ledgerly/back
```

## Puertos y desarrollo

- **Frontend** (Vite): http://localhost:5173
- **Backend** (NestJS): http://localhost:3000/api

El frontend proxya las peticiones `/api` al backend en desarrollo (ver
`apps/front/vite.config.ts`), y el backend tiene CORS habilitado para el
origen del front. Copia `apps/back/.env.example` a `apps/back/.env` para
personalizar `PORT` y `FRONTEND_URL`.
