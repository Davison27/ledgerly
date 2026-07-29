# Despliegue en producción (VPS)

Contexto: `deploy/` (`docker-compose.yml`, `Caddyfile`, `scripts/*.sh`, `.env.example`),
`apps/back/Dockerfile`, `apps/front/Dockerfile`, `apps/front/Caddyfile`,
`.dockerignore`. Orquestación: `Makefile` (`setup`, `doctor`, `configure`,
`update`, `up`, `down`, `restart`, `logs`, `migrate`, `backup`, `restore`).

Este documento cubre cómo se instala y opera Ledgerly en un servidor propio.
Para la parte de autenticación (Google Cloud, variables de sesión) ver
`docs/architecture/auth.md` § «Puesta en marcha», que sigue siendo la fuente
de verdad de ese guion; aquí solo se referencia.

## Topología: un único origen para front y API

Caddy es el único punto de entrada del dominio. Enruta `/api/*` al backend y
todo lo demás al front, servido como ficheros estáticos por un segundo Caddy
interno (mismo binario que el proxy, un solo formato de configuración que
mantener):

```
Internet → Caddy (TLS, :80/:443)
             ├─ /api/*  → back:3000
             └─ resto   → front:8080 (estático)
```

La imagen del front se construye con `VITE_API_URL=/api` — una ruta
**relativa**, sin dominio. Es la decisión de la que depende todo lo demás en
este documento:

- **`make configure` puede cambiar el dominio sin reconstruir el front.** Si
  la URL de la API estuviera incrustada en el bundle en tiempo de compilación
  (`--build-arg`), cambiar de dominio exigiría reconstruir la imagen del front
  cada vez — 2-4 minutos y una forma más de dejar la app rota a medio camino.
  Con ruta relativa, la misma imagen sirve para cualquier dominio: cambiar de
  dominio es reescribir `deploy/.env` y `docker compose up -d`.
- **CORS deja de intervenir**: el navegador ve front y API en el mismo
  origen, así que no hace falta configurarlo ni mantenerlo sincronizado con el
  dominio.
- **`OriginGuard`** (`shared/infrastructure/http/access/origin.guard.ts`), que
  exige que `Origin`/`Referer` coincidan con `FRONTEND_URL`, cuadra sin casos
  especiales porque `Origin` es literalmente `https://<dominio>`.
- Las cookies de sesión (`lg_session`, `lg_csrf`, `SameSite=Lax`, `Secure`)
  funcionan sin excepciones de dominio cruzado.

La alternativa de un `config.json` leído en tiempo de ejecución se descartó
porque añade una petición bloqueante antes del primer render y un punto de
fallo más, para resolver algo que el mismo origen ya resuelve gratis.

## Por qué el instalador es bash y no Node

Un VPS recién creado tiene bash y coreutils; no tiene Node ni pnpm. Instalar
Node en el host solo para hacer unas preguntas de configuración contradice
que la aplicación entera viva en contenedores — sería una dependencia del
host que no aporta nada a la aplicación. Bash da además `read -rs` (leer un
secreto sin mostrarlo en pantalla) sin ninguna dependencia externa.

La lógica del instalador vive en `deploy/scripts/*.sh`, no en el `Makefile`:
los objetivos de `make` son de una línea que invocan esos scripts. Así se
puede instalar sin `make` (`bash deploy/scripts/setup.sh`), que en una imagen
mínima de Debian no viene instalado por defecto.

## Mapa de contenedores y volúmenes

`deploy/docker-compose.yml` (`name: ledgerly`), invocado siempre como
`docker compose -f deploy/docker-compose.yml --env-file deploy/.env`:

| Servicio | Imagen | Publica puertos | Volumen |
| --- | --- | --- | --- |
| `postgres` | `postgres:17-alpine` | no | `pgdata` |
| `back` | `ledgerly-back:local` (build propio) | no | — |
| `front` | `ledgerly-front:local` (build propio, Caddy estático) | no | — |
| `caddy` | `caddy:2.11-alpine` | `80`, `443`, `443/udp` | `caddy_data`, `caddy_config` |
| `migrator` | `ledgerly-back:local`, perfil `tools` | no | — |

`migrator` no se levanta con el resto: se invoca a demanda con
`docker compose … --profile tools run --rm migrator` (lo hace `make migrate`
y, dentro de él, `make update`).

**`caddy_data` guarda los certificados de Let's Encrypt y no se borra en
ningún objetivo, ni siquiera en `make clean`** (que además se niega a correr
en producción). Perderlo obliga a reemitir los certificados y consume la
cuota semanal de Let's Encrypt por dominio.

## Por qué Postgres deja de publicar su puerto en producción

En desarrollo, `apps/back/docker-compose.yml` publica `5432` porque es
cómodo conectar un cliente gráfico desde el portátil. En producción esa
comodidad es superficie de ataque gratuita: nada en el servidor necesita
conectarse a Postgres desde fuera de la red de Docker, así que
`deploy/docker-compose.yml` no publica el puerto. Para inspeccionar la base
de datos a mano en el servidor:

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env \
  exec postgres psql -U ledgerly ledgerly
```

## Configuración: `deploy/.env` y el centinela `deploy/.state`

Tres ficheros, todos con permisos restringidos y todos ignorados por git:

- **`deploy/.env`** (0600) — la configuración: dominio, credenciales de
  Google, contraseña de Postgres, etc. Ver la lista completa de claves en
  `deploy/.env.example`.
- **`deploy/.state`** (0600) — el centinela: en qué punto está la
  instalación.
- **`deploy/backups/`** (0700) — las copias de seguridad.

### Por qué se distingue «empezado» de «completado»

`deploy/.state` no es un booleano, tiene tres valores:
ausente / `in_progress` / `completed`. La distinción existe porque construir
las imágenes y levantar los contenedores puede terminar sin que la
instalación esté realmente lista — una migración puede fallar, el certificado
puede no emitirse, el dominio puede apuntar a otro sitio. Por eso el estado
solo pasa a `completed` **después de que la sonda pública responda `200`**
(`https://$LEDGERLY_DOMAIN/api/health`), no en cuanto los contenedores se
levantan. Antes de eso está `in_progress`: sirve para que un `setup`
interrumpido (`Ctrl-C`, un corte de red) se pueda retomar sin volver a
escribir lo ya contestado — cada pregunta ofrece como valor por omisión lo
que ya está guardado en `deploy/.env`.

`make setup` se niega a volver a ejecutarse si `deploy/.state` dice
`completed`. Y también si el centinela no está pero `deploy/.env` está
completo y ya existe el miembro fundador en `workspace_members` — para cubrir
el caso de que alguien borre el fichero de estado a mano pensando que así se
puede reinstalar; en ese caso el instalador reescribe el centinela y remite a
`make doctor` / `make configure`. Escape para soporte, que nunca borra
datos: `LEDGERLY_ALLOW_RESETUP=1 make setup`.

## Instalación: `make setup`

Cinco preguntas, en este orden — el dominio va primero porque de él sale la
URI de redirección que hay que pegar en Google **antes** de pedir las
credenciales:

1. **Dominio** — valida que no lleve protocolo ni barra final, y que el DNS
   resuelva a la IP pública de la máquina.
2. **Credenciales de Google** (client ID y secreto) — el guion completo de
   Google Cloud (Auth Platform, *branding*, *audience*, *scopes*, creación
   del cliente OAuth) es el mismo que describe
   `docs/architecture/auth.md` § «Puesta en marcha», con la diferencia de que
   aquí el origen y la redirección son `https://<dominio>` en vez de
   `localhost`. `make setup` los imprime ya resueltos con el dominio
   introducido en el paso anterior, para copiar y pegar sin errores.
3. **Correo del administrador inicial** — se usa también como contacto de
   Let's Encrypt (`ACME_EMAIL`), así que no se pregunta aparte.
4. **Zona horaria** — con valor por omisión tomado del host.

Hasta que se confirma el resumen final no se escribe nada: se puede
interrumpir con `Ctrl-C` sin dejar rastro. A partir de la confirmación:
escribe `deploy/.env`, construye las imágenes, levanta Postgres, aplica las
24 migraciones, levanta backend/frontend/proxy, pide el certificado y
comprueba la sonda pública. Solo entonces marca la instalación como
`completed`.

## Diagnóstico: `make doctor`

Pensado para ejecutarse a mano y desde cron (`--quiet` solo imprime lo que no
está bien). Sale `0` si no hay ningún `[FAIL]` — los `[WARN]` no lo tumban.
Comprueba, en orden:

- Docker y Docker Compose instalados.
- `deploy/.env` presente, con permisos `600` y todas las claves de
  `deploy/.env.example`.
- Coherencia de esa configuración: `NODE_ENV=production`,
  `COOKIE_SECURE=true`, `TRUST_PROXY=true`, `DB_HOST=postgres`, y que
  `FRONTEND_URL` y `BACKEND_PUBLIC_URL` sean ambos `https://$LEDGERLY_DOMAIN`.
- Estado y salud de los cuatro contenedores.
- Conexión real a Postgres con las credenciales del `.env`, y migraciones
  pendientes (vía `migrator … migration:show`).
- DNS del dominio contra la IP pública del servidor.
- Puertos `80`/`443` atendidos por Caddy y `https://<dominio>/api/health` →
  `200`.
- Caducidad del certificado TLS.
- Espacio en disco y tamaño de las imágenes.
- Que exista el administrador fundador
  (`SELECT count(*) FROM workspace_members WHERE is_founder`) — si no,
  recuerda que falta completar el alta desde la web.

**Nunca imprime el valor de un secreto**, solo si está presente o ausente.

## Reconfiguración: `make configure`

Menú para cambiar, sin editar `deploy/.env` a mano: dominio, credenciales de
Google, correo del administrador inicial, o rotar la contraseña de Postgres.
Antes de aplicar cada cambio imprime sus consecuencias y pide confirmación:

- **Dominio**: hay que actualizar el origen y la redirección en Google Cloud
  (se imprimen ya con el dominio nuevo); las sesiones abiertas se pierden
  porque las cookies pertenecen al dominio anterior. Gracias al mismo origen
  con ruta relativa (arriba), **no hace falta reconstruir el front**: basta
  reescribir `deploy/.env` y `docker compose up -d` — Caddy y el backend se
  recrean solos al cambiar su entorno.
- **Credenciales de Google**: las sesiones vivas siguen siendo válidas (la
  sesión es propia de Ledgerly, no un token de Google); solo cambian los
  inicios de sesión nuevos.
- **Correo del administrador**: si el fundador ya existe, cambiar esta
  variable no traspasa la cuenta; el traspaso exige borrar la fila
  correspondiente en `workspace_members` (ver `docs/architecture/auth.md`).
- **Contraseña de Postgres**, en este orden exacto — `ALTER USER` dentro del
  contenedor → reescribir `deploy/.env` → recrear `back` y `migrator`. Si el
  segundo o el tercer paso fallan, la contraseña real ya es la nueva; se
  arregla repitiendo la opción.

Termina llamando a `make doctor`.

## Actualización: `make update`

1. Exige una instalación completada.
2. `git pull --ff-only` (si hay cambios locales sin commitear, aborta y lo
   explica).
3. Copia de seguridad automática (`make backup`) antes de tocar nada.
4. Reconstruye las imágenes, levanta Postgres, aplica las migraciones
   pendientes, levanta el resto de servicios.
5. Limpia imágenes viejas y termina con `make doctor`.

**Nunca ejecuta `down -v` ni toca ningún volumen.** Es la garantía de que
actualizar la versión no es una operación destructiva salvo que la propia
migración lo sea (y las migraciones del proyecto no borran datos, ver
`apps/back/src/database/migrations/`).

## Copias de seguridad: por qué basta con `pg_dump`

Los ficheros que suben los usuarios (facturas, documentos de personal) no
viven en un volumen del sistema de ficheros: se guardan como `bytea` dentro
de la fila de `documents` en Postgres
(migración `1724000000000-AddDocumentFiles.ts`). No hay, por tanto, un
volumen de ficheros que respaldar aparte del propio Postgres — **un
`pg_dump` es la copia completa** de la aplicación.

`make backup` hace `pg_dump -Fc` (formato comprimido de `pg_restore`) a
`deploy/backups/ledgerly-<fecha UTC ISO>.dump`, con permisos `600`, y
conserva las 14 copias más recientes. `make restore` recibe la ruta de un
dump (o toma el más reciente si no se indica ninguno), exige teclear
`RESTAURAR` porque **sobrescribe los datos actuales**, y aplica
`pg_restore --clean --if-exists`.

Copia diaria por cron, en el propio servidor (no hay almacenamiento remoto
configurado: eso queda fuera de alcance, ver más abajo):

```
0 3 * * * cd /opt/ledgerly && make backup >> /var/log/ledgerly.log 2>&1
```

## Fuera de alcance

- Multi-tenant y `companyId` — aplazado por diseño a la fase de auth, igual
  que en el resto del backend (`docs/architecture/tenancy.md`).
- Instalar Docker por el usuario: si falta, el instalador imprime las
  órdenes exactas y aborta. Tampoco toca el firewall del sistema.
- `www.<dominio>` u otros alias: se sirve exactamente el dominio configurado.
- Datos de ejemplo en producción — `make seed` sigue siendo exclusivo de
  desarrollo.
- CI/CD, registro de imágenes, réplicas, alta disponibilidad, y copias fuera
  de la máquina — se documenta la línea de cron, no se configura
  almacenamiento remoto.

## Ver también

- `docs/architecture/auth.md` § «Puesta en marcha» — el guion de Google
  Cloud, común a desarrollo y producción.
- `docs/architecture/tenancy.md` — el singleton de empresa y las dos puertas
  de primer arranque.
- `docs/plans/instalador-vps.md` — el plan original, con las decisiones
  D1-D4 desarrolladas y el guion completo de la sesión interactiva.
