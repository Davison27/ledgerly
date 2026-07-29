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

## Puesta en marcha

Hay dos caminos: desarrollar en local o instalar en un servidor.

### Desarrollo

Requisitos: Node.js >= 20, pnpm >= 11, Docker (para Postgres).

Un único comando instala dependencias, crea `apps/back/.env`, levanta
Postgres, ejecuta las migraciones y arranca front + back:

```bash
make dev
```

### Instalación en un servidor (VPS)

Requisitos en el servidor: `docker`, `docker compose` y `git`. En una imagen
mínima de Debian, `make` no viene instalado:

```bash
sudo apt-get install -y git make
```

Con eso:

```bash
git clone <repo-url> /opt/ledgerly && cd /opt/ledgerly && make setup
```

`make setup` es interactivo: pregunta el dominio, las credenciales de Google
y el correo del administrador, y deja la aplicación funcionando en
`https://<dominio>` con HTTPS automático. Detalle completo, guion de
preguntas y resto de comandos de operación (`doctor`, `configure`, `update`,
`backup`) en [`docs/architecture/deployment.md`](docs/architecture/deployment.md).

### Comandos (`make help`)

| Familia | Comando | Qué hace |
| --- | --- | --- |
| Instalación | `make setup` | Instalación interactiva y guiada en el servidor. Irrepetible. |
| Instalación | `make doctor` | Diagnostica la instalación y dice qué hacer; sale ≠0 si algo falla. |
| Instalación | `make configure` | Cambia dominio, credenciales de Google, correo del admin o contraseña de la BD. |
| Actualización | `make update` | Trae la versión nueva, reconstruye imágenes y migra sin perder datos. |
| Actualización | `make backup` | Copia de seguridad comprimida de la base de datos. |
| Actualización | `make restore` | Restaura una copia (pide confirmación escrita). |
| Ciclo de vida | `make up` | Levanta la pila (producción o el Postgres de desarrollo). |
| Ciclo de vida | `make down` | La para. |
| Ciclo de vida | `make restart` | La reinicia. |
| Ciclo de vida | `make logs` | Sigue los logs; `make logs SERVICE=back` filtra un servicio. |
| Desarrollo | `make dev` | Bucle local: deps, Postgres, migraciones y `pnpm dev`. |
| Desarrollo | `make build` | Compila front y back. |
| Desarrollo | `make lint` | ESLint. |
| Desarrollo | `make typecheck` | Comprueba tipos. |
| Desarrollo | `make test` | Tests. |
| Base de datos | `make migrate` | Aplica migraciones pendientes. |
| Base de datos | `make reset-db` | Borra el volumen y recrea la BD. Solo desarrollo. |
| Base de datos | `make seed` | Datos de ejemplo. Solo desarrollo. |
| Limpieza | `make clean` | Limpia builds, `node_modules` y volúmenes de desarrollo. Se niega en producción. |

`up`, `down`, `restart`, `logs`, `migrate` y `backup` son **contextuales**:
actúan sobre la pila de producción si existe `deploy/.env`, y si no sobre el
Postgres de desarrollo. El mismo comando hace lo correcto en el servidor y en
el portátil.

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
