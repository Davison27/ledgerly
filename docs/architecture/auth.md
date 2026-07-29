# Autenticación (Google OAuth + sesión propia)

Contexto: `apps/back/src/contexts/auth/` (agregados `WorkspaceMember`, `Session`,
`LoginAttempt`). Guard y decoradores compartidos:
`apps/back/src/shared/infrastructure/http/access/`. Frontend:
`apps/front/src/entities/session/` (login), `apps/front/src/entities/workspace-member/`
(miembro autenticado y gestión del equipo), `apps/front/src/pages/login/`,
`apps/front/src/shared/api/csrf.ts` y
`apps/front/src/widgets/app-layout/ui/layout/SessionGuard.tsx`.

## El guard deniega por defecto: sin decorador, sin acceso

`AccessGuard` (`shared/infrastructure/http/access/access.guard.ts`) es el
`APP_GUARD` que corre en todas las rutas. Primero mira `@Public()`; si no está,
busca un `AccessRequirement` puesto por `@Authenticated()`, `@RequiresAdmin()`
o `@RequiresAccess(module, level)`. **Si no encuentra ninguno de los tres,
lanza `ForbiddenException` directamente**, antes incluso de mirar si hay
sesión:

```ts
const requirement = this.reflector.getAllAndOverride<AccessRequirement | undefined>(
  ACCESS_REQUIREMENT_KEY,
  [context.getHandler(), context.getClass()],
);

if (!requirement) {
  throw new ForbiddenException();
}
```

La alternativa —permitir por defecto y marcar a mano lo que hay que
proteger— convierte cada controlador nuevo que alguien se olvide de decorar
en una fuga de datos silenciosa: nadie se entera hasta que alguien la
encuentra desde fuera. Con deny-by-default, ese mismo olvido se traduce en un
403 que salta en el primer `curl` o en el primer test manual. El coste es
mecánico y se paga una vez: los 17 controladores existentes de `apps/back`
llevan todos `@Public()`, `@Authenticated()`, `@RequiresAdmin()` o
`@RequiresAccess(módulo, nivel)` a nivel de clase, con las escrituras
(`@Post`/`@Patch`/`@Put`/`@Delete`) subiendo el nivel exigido a `edit` cuando
hace falta (el metadato de método gana al de clase).

## Sesión: cookie `httpOnly` con identificador opaco, no JWT

`lg_session` es 32 bytes aleatorios en base64url
(`NodeTokenGenerator.generateOpaqueToken`,
`infrastructure/crypto/node-token-generator.ts`), no un token autocontenido.
Se emite como `HttpOnly; SameSite=Lax; Path=/` con 12 h de vida
(`infrastructure/http/auth-cookies.ts`). Dos motivos, no uno:

- **Revocable al instante.** Un JWT no se puede invalidar antes de su `exp`
  sin mantener una lista negra que, en la práctica, acaba siendo... una tabla
  de sesiones. Aquí no hay ese rodeo: `AccessGuard` resuelve sesión y miembro
  contra Postgres en cada petición (`SessionRepository.findActiveByTokenHash`),
  así que revocar es una fila que deja de aparecer en la siguiente consulta,
  no una ventana de gracia hasta que expire un token que ya está en manos de
  otro.
- **Ilegible desde JavaScript.** `HttpOnly` significa que un XSS en la propia
  app no puede leer `document.cookie` y llevarse el identificador de sesión.
  `lg_csrf`, en cambio, se emite **sin** `HttpOnly` a propósito
  (`auth-cookies.ts`): el front necesita leerlo (`shared/api/csrf.ts`,
  `readCsrfToken()`) para reenviarlo en la cabecera `X-CSRF-Token` en cada
  método no seguro (double-submit). Son cookies con el mismo origen y el
  mismo TTL pero con `HttpOnly` invertido porque protegen contra amenazas
  distintas: una evita el robo del identificador, la otra necesita ser
  legible para que el double-submit funcione.

En Postgres (`sessions.token_hash`, `sessions.csrf_hash`, migración
`1743000000000-CreateAuth.ts`) **solo se guarda el SHA-256 hex** de cada
valor, nunca el valor en claro. `AccessGuard` hashea la cookie recibida y
busca por hash (`this.tokenGenerator.hash(sessionToken)`); comparar el CSRF
usa `hashesMatch` con `timingSafeEqual` (`domain/hash-equality.ts`) para no
abrir un canal lateral por temporización. La consecuencia práctica: leer la
tabla `sessions` —una fuga de base de datos, un `SELECT *` de más, una copia
de seguridad mal guardada— no le da a nadie una sesión utilizable. Haría
falta también el valor original de 32 bytes, que nunca toca la base de
datos.

## El rechazo del miembro deshabilitado, por duplicado a propósito

Un miembro `disabled` no puede volver a entrar por Google. Esta regla está
escrita en **dos sitios**, no uno:

- **El agregado** (`domain/workspace-member.ts`, `bindGoogleAccount`): lanza
  `GoogleIdentityRejectedException` si `this.isDisabled()`, antes de tocar
  `googleSubject`, `name` o `status`.
- **El caso de uso** (`application/complete-google-login/complete-google-login.use-case.ts`,
  `resolveMember`): si el miembro no existe o `member.isDisabled()`, lanza la
  misma excepción **antes** de llamar a `bindGoogleAccount` y antes de guardar
  nada.

No es descuido, es redundancia deliberada. La comprobación del agregado es la
que no se puede saltar desde ningún camino futuro que llame a
`bindGoogleAccount` directamente, aunque a ese camino se le olvide mirar el
estado antes. La del caso de uso documenta el orden explícito de
comprobaciones (resolver miembro y cortar **antes** de mutar nada) y evita
una escritura innecesaria en el camino feliz del rechazo. En una regla cuya
falta se llama «la persona a la que le quitaron el acceso vuelve a entrar por
la puerta de atrás», la redundancia sale barata.

Por si las dos fallaran, `AccessGuard` añade una tercera barrera *después*
del login: cada petición vuelve a resolver `member.isActive()`
(`resolveActiveSession`) contra la fila actual, así que aunque existiera una
sesión ya emitida, deshabilitar al miembro la corta en la siguiente petición
sin esperar a que expire.

## El primer administrador: variable de entorno, no "el primero que llega"

`BOOTSTRAP_ADMIN_EMAIL` (obligatoria en `config/env-validation.schema.ts`) es
el único correo que `BootstrapFirstAdminUseCase`
(`application/bootstrap-first-admin/bootstrap-first-admin.use-case.ts`)
acepta para crear el miembro fundador. Si el correo no coincide, o si ya
existe algún miembro (`countAll() > 0`), la respuesta es el mismo
`403 BOOTSTRAP_UNAVAILABLE` en los dos casos: nadie puede distinguir desde
fuera "ese correo no es el admin" de "esta instancia ya tiene dueño".

El motivo de fijarlo por variable de entorno en vez de "quien complete el
alta primero es el admin": si la instancia queda expuesta en la red antes de
que alguien la configure —un despliegue en la nube al que todavía no le ha
dado tiempo a cerrar el firewall, por ejemplo—, "el primero que llega gana"
es una ventana de secuestro trivial: cualquiera que encuentre el puerto se
declara administrador. Fijar el correo en una variable que solo controla
quien despliega cierra esa ventana: se puede rellenar el formulario de alta
con cualquier correo, pero solo el que coincide con
`BOOTSTRAP_ADMIN_EMAIL` obtiene una fila.

La comprobación `countAll() > 0` del caso de uso es en memoria y por tanto
vulnerable a una carrera (dos peticiones simultáneas pueden pasarla las dos).
La garantía real es un **índice único parcial** de Postgres:

```sql
CREATE UNIQUE INDEX "UQ_workspace_members_single_founder"
  ON "workspace_members" ("is_founder") WHERE "is_founder"
```

Solo puede existir una fila con `is_founder = true`. Ante dos altas
concurrentes, las dos superan el `countAll()` en memoria pero solo una
`INSERT` gana en la base de datos; la otra revienta con una violación de
unicidad de Postgres que `TypeOrmWorkspaceMemberRepository.insertFounder`
traduce a `UniqueConstraintException`, y que el caso de uso vuelve a traducir
al mismo `BootstrapUnavailableException` de siempre. La unicidad la impone
Postgres, no el código de aplicación.

Si te equivocas de correo en `BOOTSTRAP_ADMIN_EMAIL` **después** de haber
completado el alta, no hay pantalla que lo arregle: se corrige borrando la
fila de `workspace_members` en Postgres.

## Ruta pública de marca, con exactamente tres campos

`GET /api/company/branding` es `@Public()` (`contexts/company/infrastructure/http/company.controller.ts`)
porque la pantalla de login no tiene sesión y necesita el logo de la empresa
para pintarse; `GET /api/company`, en cambio, es `@Authenticated()` porque
devuelve datos que no pueden salir sin sesión (`taxId`, `email`, `phone`,
`address`…). Sin esta ruta separada, la única forma de pintar el logo antes
de iniciar sesión sería abrir `GET /api/company` entero.

`CompanyBrandingResponse` se construye campo a campo desde el agregado
(`application/get-company-branding/get-company-branding.use-case.ts`),
**nunca** reutilizando ni filtrando `CompanyResponse`:

```ts
export interface CompanyBranding {
  name: string;
  logo: string | null;
  brandColor: string | null;
}
```

**Invariante que nadie debe relajar: exactamente estos tres campos, ni uno
más.** Cada campo que se añade aquí es superficie sin autenticar. Si algún
día el login necesita un cuarto dato, la pregunta es si ese dato puede ser
público, no si es cómodo añadirlo. Construir la respuesta a mano en vez de
reutilizar `CompanyResponse` es lo que evita que un campo nuevo en `Company`
(pensado para la pestaña de empresa autenticada) se cuele en esta ruta
pública sin que nadie se dé cuenta. Cuando todavía no existe empresa, la
respuesta sigue siendo `200` con `name: ''` y los otros dos a `null` — no
`404`: "aún no hay empresa" es el estado normal en la primera ejecución y no
es asunto de la pantalla de login.

## Sin refresh tokens de Google hoy, con la puerta abierta a autorización incremental

`GoogleOAuthIdentity.buildAuthorizationUrl`
(`infrastructure/google/google-oauth-identity.ts`) pide `access_type:
'online'` y solo los scopes `openid email profile`
(`GOOGLE_LOGIN_SCOPES`). En modo `online`, Google ni siquiera emite un
refresh token, así que no hay nada que guardar por descuido. La razón: un
almacén de credenciales de Google sin consumidor hoy es pura superficie de
ataque — nadie usa esos tokens todavía, así que guardarlos sería asumir un
riesgo (una tabla de secretos que hay que cifrar, rotar y proteger) a cambio
de nada.

La puerta a Calendar/Drive el día que haga falta queda abierta sin rehacer el
flujo: `include_granted_scopes: true` ya está puesto, y el flujo elegido
—*authorization code* con PKCE, mediado por el backend— es el único que
admite acceso `offline`. Añadir la primera integración real es: cambiar
`access_type` a `'offline'`, añadir `prompt: 'consent'`, declarar el scope
nuevo y crear una tabla de credenciales cifradas — no cambiar cómo se pide
consentimiento ni cómo se intercambia el código.

## Sesiones vivas: qué pasa al revocar o mutar un acceso

- **Cualquier cambio a un miembro revoca todas sus sesiones**, no solo los
  cambios de permisos. `UpdateWorkspaceMemberUseCase`
  (`application/update-workspace-member/update-workspace-member.use-case.ts`)
  llama a `sessionRepository.revokeAllForMember(member.getId(), now)` tras
  guardar, sea el cambio un simple `rename` o un ascenso a admin. Es más
  simple de razonar que revocar solo condicionalmente cuando el cambio "toca
  acceso": el miembro que edita su propio nombre desde el panel de admin no
  se queda fuera (esa ruta la bloquea `SelfAccessChangeException` antes de
  llegar aquí), pero cualquier otra edición sobre un tercero cierra sus
  sesiones activas sin excepciones que recordar.
- **Expulsar a un miembro** (`RemoveWorkspaceMemberUseCase`) borra la fila de
  `workspace_members`; `sessions.member_id` tiene `ON DELETE CASCADE`
  (migración `1743000000000-CreateAuth.ts`), así que sus sesiones
  desaparecen con él sin que el caso de uso tenga que revocarlas a mano.
- **La comprobación no espera a que la cookie expire.** `AccessGuard`
  resuelve sesión y miembro en la misma consulta en cada petición
  (`findActiveByTokenHash`) y corta con `401` si `member.isActive()` es
  falso. Una sesión de 12 h de vida absoluta no significa 12 h de acceso
  garantizado: en cuanto un admin cambia el estado o los permisos de
  alguien, la siguiente petición de esa persona ya ve el cambio.

## El correo de Google debe venir verificado

`CompleteGoogleLoginUseCase.checkIdentity`
(`application/complete-google-login/complete-google-login.use-case.ts`)
rechaza el login si `identity.emailVerified` es falso, con el mismo
`GoogleIdentityRejectedException` (y el mismo `access_denied` genérico de
cara al front) que usa para un correo desconocido o un miembro deshabilitado.
Ese campo viaja tal cual desde el `id_token` de Google
(`payload.email_verified === true` en `google-oauth-identity.ts`, tras
`verifyIdToken`). Sin esta comprobación, cualquiera que dé de alta un correo
personalizado sin verificar en su cuenta de Google podría reclamar el acceso
de un miembro invitado con ese mismo correo, sin que Google haya confirmado
que esa persona controla realmente esa dirección.

## Endpoints y throttle

| Método | Ruta | Acceso | Throttle |
|---|---|---|---|
| `GET` | `/api/auth/status` | `@Public()` | 60/min |
| `POST` | `/api/auth/bootstrap` | `@Public()` | 5/min |
| `POST` | `/api/auth/google/start` | `@Public()` | 10/min |
| `GET` | `/api/auth/google/callback` | `@Public()` | 20/min |
| `POST` | `/api/auth/logout` | `@Authenticated()` | 30/min |
| `GET` | `/api/auth/me` | `@Authenticated()` | global |
| `GET` | `/api/company/branding` | `@Public()` | 60/min |
| `GET`/`POST`/`PATCH`/`DELETE` | `/api/workspace/members*` | `@RequiresAdmin()` | global |

`GET /api/auth/google/callback` nunca devuelve JSON: siempre `302`, con
`Set-Cookie` de `lg_session`/`lg_csrf` en éxito o `?authError=<code>` en
fallo (`access_denied \| expired \| failed`, un único código para todos los
rechazos de identidad).

## Puesta en marcha

### 1. Google Cloud — Google Auth Platform

La consola se reorganizó en 2025-2026: el antiguo "OAuth consent screen"
ahora vive bajo **Google Auth Platform**, con cuatro secciones.

1. [console.cloud.google.com](https://console.cloud.google.com) → crear o
   seleccionar proyecto (por ejemplo, `ledgerly`).
2. Menú lateral → **Google Auth Platform** → si aparece "not configured
   yet", pulsar **Get started**.
   - **Branding**: nombre de la app (`Ledgerly`), correo de soporte, correo
     de contacto del desarrollador.
   - **Audience**: **External**, salvo que la instancia se restrinja a un
     dominio de Google Workspace, en cuyo caso **Internal**. Esta elección
     **no se puede cambiar después** sin crear un proyecto nuevo.
     Con **External** en modo *Testing*, hay que añadirse una misma como
     **Test user**; sin eso el propio login falla.
   - **Data access**: añadir solo `openid`, `.../auth/userinfo.email` y
     `.../auth/userinfo.profile`. Los tres son *scopes* no sensibles, sin
     evaluación de Google que superar. **No añadir scopes de Calendar,
     Drive ni Gmail** todavía: son *restricted* y disparan la evaluación
     CASA (ver la nota de autorización incremental más arriba).
3. **Clients** → **Create client** → tipo de credencial **Web application**,
   nombre por ejemplo `ledgerly-local`.
   - **Authorized JavaScript origins**: `http://localhost:5173`
   - **Authorized redirect URIs**: `http://localhost:3005/api/auth/google/callback`
     — exacto, con el puerto incluido y sin barra final
     (`buildRedirectUri()` en `google-oauth-identity.ts` construye
     `${BACKEND_PUBLIC_URL}/api/auth/google/callback`). Es el error más
     habitual (`redirect_uri_mismatch`) si no coincide carácter a carácter.
4. Copiar el **Client ID** y el **Client secret** generados.

### 2. Variables de entorno nuevas (`apps/back/.env`)

| Variable | Valor en local |
|---|---|
| `GOOGLE_CLIENT_ID` | `<tu-client-id>.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `<tu-client-secret>` |
| `BOOTSTRAP_ADMIN_EMAIL` | `tu-correo@gmail.com` |
| `BACKEND_PUBLIC_URL` | `http://localhost:3005` |
| `COOKIE_SECURE` | `false` |
| `TRUST_PROXY` | `false` |

`PORT=3005` y `FRONTEND_URL=http://localhost:5173`, que ya existían, no
cambian. En producción: `COOKIE_SECURE=true` (Joi lo exige a partir de
`NODE_ENV=production`), `BACKEND_PUBLIC_URL` con `https://…`,
`TRUST_PROXY=true` si hay proxy delante, y una segunda credencial de Google
con las URIs de producción.

### 3. Orden de arranque, la primera vez

1. Migrar la base de datos: `pnpm --filter @ledgerly/back migration:run`
   (aplica `1743000000000-CreateAuth.ts`).
2. Rellenar las seis variables de arriba en `apps/back/.env`.
3. Arrancar el backend: `pnpm --filter @ledgerly/back dev`.
4. Abrir `http://localhost:5173/`: la pantalla pide un correo para el alta
   del primer administrador. Solo se acepta el que coincide exactamente con
   `BOOTSTRAP_ADMIN_EMAIL`; cualquier otro da el mismo error genérico. Al
   enviarlo, redirige al consentimiento de Google y vuelve con sesión ya
   iniciada.
5. Esa sesión entra en `/onboarding` (alta de la empresa, gobernada por
   `companyNeedsSetup()`, ver `docs/architecture/tenancy.md` — es una puerta
   distinta y posterior a la de auth) y de ahí a `/dashboard`.

**Advertencia: sin `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y
`BOOTSTRAP_ADMIN_EMAIL` el backend no arranca.** `config/env-validation.schema.ts`
los marca `.required()`, y `ConfigModule.forRoot({ validationSchema })`
falla al arrancar, no al compilar — es la misma disciplina deny-by-default
del guard aplicada a la configuración: mejor un backend que se niega a
arrancar que uno arrancando con un cliente de Google mal configurado y
sirviendo tráfico igualmente.

## Ver también

- `docs/plans/autenticacion-google.md` — plan original de la feature, con la
  superficie de seguridad completa (checklist S1-S19) y el guion de pruebas
  manuales.
- `docs/architecture/tenancy.md` — el singleton de empresa que sigue sin
  `companyId`, y las dos puertas de primer arranque (`bootstrapNeeded` y
  `companyNeedsSetup`).
- `docs/architecture/workspace.md` — la matriz de permisos, las guardas de
  autoprotección y la gestión de miembros del espacio contra el backend
  real.
- `docs/architecture/data-layer.md` — `sessionQueries` y
  `companyQueries.branding()`.
