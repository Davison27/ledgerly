# Ledgerly

Monorepo pnpm + Turborepo: `apps/back` (NestJS + TypeORM + Postgres, arquitectura
hexagonal por contextos) y `apps/front` (React + Vite).

---

# Pipeline de orquestación (OBLIGATORIO)

Toda tarea que David encargue se ejecuta con este pipeline de 4 fases. **No hace
falta que lo pida: es el modo por defecto.** Esto constituye autorización
permanente y explícita para lanzar subagentes sin preguntar antes.

```
David ──▶ [1] planner (opus) ──▶ [2] plan-validator (opus) ──▶ David aprueba
                   ▲                        │
                   └──── iteración ─────────┘
                                            │
                            ┌───────────────┴───────────────┐
                            ▼                               ▼
                   [3] implementer (sonnet)   …N en paralelo…   (sonnet)
                            └───────────────┬───────────────┘
                                            ▼
                                     [4] qa (sonnet)
                                            │
                             ┌──────────────┴──────────────┐
                        PASS ▼                        FAIL ▼
                       commits                  vuelve a [3]
```

## Fase 1 — `planner` (Opus)

Reescribe y **enriquece** el enunciado de David (que suele venir en una línea) y
produce el plan de acción completo. Audita huecos: casos borde, capas back/front,
migraciones, i18n, tests, contratos de API.

- Síncrono (`run_in_background: false`) — todo lo demás depende de su salida.
- El plan se escribe en `docs/plans/<slug>.md`.

## Fase 2 — `plan-validator` (Sonnet)

Ingeniero que verifica que el plan es **realizable** contra el código real: que
los ficheros y símbolos citados existen, que el orden de pasos es viable, que no
rompe contratos ni migraciones existentes. Es trabajo mecánico de contraste
contra el código, por eso va en Sonnet.

- Devuelve `APPROVED` o `CHANGES_REQUESTED` con objeciones concretas.
- Si pide cambios → vuelve al `planner` con las objeciones.
- **Una sola vuelta de validación.** Cuando el `planner` aplica las objeciones,
  **las verifico yo** leyendo el diff del plan, sin relanzar al validador. Solo
  se hace una segunda pasada si los cambios fueron estructurales (se movieron
  unidades, cambió el orden de merge). Medido: la segunda vuelta rutinaria cuesta
  ~250k tokens y en la última tarea no encontró ni un bloqueante.

## Fase 3 — `implementer` (Sonnet) ×N

Escriben el código. Tantos como convenga; **paralelizar solo cuando los ámbitos
de ficheros no se solapan** (típico: uno back, otro front).

- En paralelo → `run_in_background: true`, y con `isolation: "worktree"` si dos
  agentes pudieran tocar ficheros comunes.
- Cada uno recibe el plan aprobado y **su porción** delimitada, no el plan entero
  como tarea.

## Fase 4 — `qa` (Sonnet)

Valida el código contra el plan aprobado: cobertura punto por punto, build, tests,
lint, y regresiones. Devuelve `PASS` o `FAIL` con la lista de defectos.

- `FAIL` → nuevo `implementer` con los defectos. No se commitea nada en rojo.
- `PASS` → commits siguiendo la convención de abajo.

## Reglas de asignación de modelo

| Fase | Agente | Modelo | Puede escribir código |
|---|---|---|---|
| 1 | `planner` | **opus** | no |
| 2 | `plan-validator` | **sonnet** | no |
| 3 | `implementer` | **sonnet** | sí |
| 4 | `qa` | **sonnet** | no |

**Opus solo piensa; Sonnet escribe.** Nunca implementar código yo directamente ni
con Opus: si la tarea requiere editar ficheros del producto, va a un `implementer`.

Opus queda reservado al `planner`, que es donde el juicio cambia el resultado.
Validar, implementar y revisar son trabajos de contraste contra el código.

---

# Coste (IMPORTANTE)

David paga esto y el pipeline es caro. **Escalar la ceremonia al tamaño real de
la tarea**, no aplicar las cuatro fases por inercia:

| Tamaño | Qué se hace |
|---|---|
| Una línea, entorno, pregunta | Directo, sin agentes. Decirlo. |
| Una unidad, un solo fichero/capa | Yo planifico + un `implementer` + verifico yo |
| Varias capas o back+front | Pipeline completo |

Además, siempre:

- **Planes concisos.** El `planner` escribe para que un Sonnet ejecute, no para
  archivo. Cada línea del plan la releen después 3-4 agentes: la verbosidad se
  paga varias veces. Nada de repetir la misma decisión en cinco sitios.
- **Agrupar unidades en un mismo `implementer`** cuando son secuenciales y del
  mismo ámbito. Arrancar un agente por unidad multiplica el contexto releído.
- **Verificar yo lo barato.** Ejecutar `pnpm test`, mirar un diff, comprobar una
  migración contra Postgres o confirmar dos líneas con `rg` no necesita un
  subagente: cuesta una fracción y es más fiable que preguntar.
- **Nunca relanzar un agente con `Agent` si sigue vivo**: `SendMessage` conserva
  su contexto; `Agent` lo re-deriva entero desde cero.

## Cómo se comunican los agentes

Los subagentes **no pueden hablarse entre sí** — es una limitación real del
harness. Todo pasa por mí como orquestador:

- Para continuar con un agente ya lanzado conservando su contexto: `SendMessage`
  con su ID. **No** relanzar con `Agent` (arrancaría en frío y re-derivaría todo).
- Ronda de preguntas entre `planner` y `plan-validator`: el agente termina su
  turno con un bloque `## PREGUNTAS PARA <agente>`, yo lo traslado con
  `SendMessage` y le devuelvo la respuesta al que preguntó.
- **Preguntas para David:** cualquier agente puede terminar con un bloque
  `## BLOQUEANTE PARA DAVID`. Yo las elevo con `AskUserQuestion` y devuelvo la
  respuesta al agente. Los subagentes no tienen canal directo con el usuario.
- El informe final de un subagente **no lo ve David**. Siempre resumir yo lo que
  importa.

## Cuándo saltarse el pipeline

Para cambios triviales de una línea, arreglos de entorno o preguntas puramente
informativas, la ceremonia cuesta más que la tarea: hacerlo directamente y
decirlo. En caso de duda, aplicar el pipeline.

---

# Convenciones del repo

## Commits

Conventional Commits, idénticos a los que ya hay en `git log`:

- Asunto: `type(scope): resumen en imperativo y minúscula` — `feat`, `fix`,
  `refactor`, `chore`; scope `front` o `back`.
- Cuerpo: prosa (~72 col) nombrando las clases/ficheros tocados y explicando el
  **porqué**, no solo el qué.
- Trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Un cambio lógico por commit; si toca back y front, **dos commits separados**.
- Antes de commitear: `git log -3 --format='---%n%B'` para calcar el tono.

## Documentación

`docs/` es documentación personal de David y **NUNCA se pushea al remoto**. Al
pushear `main`, asegurarse de que ningún commit de `docs/` viaja con él.

Última iteración de toda feature: actualizar `docs/` para reflejar los cambios,
**delegándolo a un `implementer` (Sonnet)**.

## Modelo de datos

`company` es un **singleton** en el backend. El multi-tenant está aplazado
deliberadamente a la fase de autenticación: no introducir `companyId` en firmas
ni rutas por adelantado.

## Verificación

```bash
pnpm i                      # raíz
pnpm --filter @ledgerly/back build
pnpm --filter @ledgerly/back test
pnpm --filter @ledgerly/back lint
```

pnpm 11 usa el mapa `allowBuilds:` en `pnpm-workspace.yaml` para aprobar scripts
de instalación — `onlyBuiltDependencies` es legacy y provoca que pnpm reescriba
el fichero con placeholders.
