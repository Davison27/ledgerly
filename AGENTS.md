# Ledgerly

Monorepo pnpm + Turborepo: `apps/back` (NestJS + TypeORM + Postgres, arquitectura
hexagonal por contextos) y `apps/front` (React + Vite).

## Pipeline obligatorio

Todo encargo de David usa este flujo por defecto. Hay autorización permanente
para lanzar subagentes cuando corresponda; no hay que pedirla antes.

1. `planner` (`gpt-5.6-terra`, `high`) enriquece el enunciado, audita huecos y
   escribe solo `docs/plans/<slug>.md`.
2. `plan-validator` (`gpt-5.6-luna`, `max`) contrasta el plan con el código y
   devuelve `APPROVED` o `CHANGES_REQUESTED`.
3. David aprueba el plan. Si hay objeciones, el mismo `planner` las incorpora.
   Se verifica el diff rutinariamente sin relanzar al validador; solo hay una
   segunda validación si cambió la estructura, las unidades o su orden.
4. Uno o varios `implementer` (`gpt-5.6-terra`, `high`) reciben únicamente una
   unidad delimitada del plan aprobado. Son los únicos que editan producto.
   Paralelizar solo con ámbitos de ficheros disjuntos.
5. `qa` (`gpt-5.6-luna`, `max`) compara el resultado contra el plan, ejecuta
   verificaciones y devuelve `PASS` o `FAIL`. Un `FAIL` vuelve al implementer;
   no se hace commit en rojo.

Escala el coste al tamaño: una pregunta, entorno o cambio trivial se hace
directamente; una unidad de un fichero o capa usa planificación local, un
implementer y verificación local; cambios multicapa o back+front usan el
pipeline completo. Los planes son concisos, las unidades secuenciales del mismo
ámbito se agrupan y las comprobaciones baratas las ejecuta el orquestador.

Los subagentes no se comunican entre sí ni con David: el orquestador retransmite
preguntas y resultados. Para continuar trabajo, se retoma el mismo subagente por
su id, nunca se crea otro equivalente en frío. Todo bloqueo real se eleva al
usuario con opciones concretas; el informe de un subagente se resume antes de
entregarlo a David.

Antes de cualquier trabajo en `apps/back` se usa `$arquitectura-hexagonal`; antes
de cualquier trabajo en `apps/front` se usa `$arquitectura-frontend`.

## Convenciones duraderas

- Cero comentarios de código, incluidos JSDoc. Se conservan únicamente las
  directivas que romperían lint o build, como `eslint-disable` o
  `@ts-expect-error`. La intención se expresa con nombres, tipos y extracción;
  el porqué va al commit, a una skill o a `docs/architecture/`.
- Commits Conventional Commits: `type(scope): resumen en imperativo y
  minúscula`, con `feat`, `fix`, `refactor` o `chore`, y scope `front` o `back`.
  El cuerpo explica el porqué y nombra clases o ficheros. Añadir
  `Co-Authored-By: OpenAI Codex <noreply@openai.com>`. Un cambio lógico por
  commit; si toca back y front, son dos commits separados. Antes de commitear,
  consultar `git log -3 --format='---%n%B'`.
- `docs/` es documentación personal de David y nunca se empuja al remoto. La
  última iteración de una feature actualiza la documentación mediante un
  implementer.
- `company` es singleton: no añadir `companyId` a firmas ni rutas hasta la fase
  de autenticación multi-tenant.

## Verificación

```bash
pnpm i
pnpm --filter @ledgerly/back build
pnpm --filter @ledgerly/back test
pnpm --filter @ledgerly/back lint
```

pnpm 11 usa `allowBuilds:` en `pnpm-workspace.yaml` para aprobar scripts de
instalación. `onlyBuiltDependencies` es legacy y hace que pnpm reescriba el
fichero con placeholders.
