# Ledgerly

pnpm and Turborepo monorepo: `apps/back` is NestJS, TypeORM, and PostgreSQL
organized by hexagonal bounded contexts; `apps/front` is React and Vite using
Feature-Sliced Design.

## Required orchestration pipeline

Use this workflow by default for work requested by David. Subagent delegation is
permanently authorized when the task size justifies it.

1. `planner` (`gpt-5.6-terra`, `high`) enriches the request, audits gaps, and
   writes only the temporary file `docs/plans/<slug>.md`.
2. `plan-validator` (`gpt-5.6-luna`, `max`) checks the plan against the real
   code and returns `APPROVED` or `CHANGES_REQUESTED`.
3. David approves the plan. The same planner incorporates objections. Routine
   edits are checked from the diff; run a second validation only when units,
   structure, or execution order changed.
4. One or more `implementer` agents (`gpt-5.6-terra`, `high`) receive one
   bounded unit each. They are the only subagents allowed to edit product code.
   Parallel work must have disjoint file scopes.
5. `qa` (`gpt-5.6-luna`, `max`) checks the implementation against the plan,
   runs verification, and returns `PASS` or `FAIL`. A failure returns to the
   same implementer; never commit a red change.

Scale ceremony to the task. Handle questions, environment work, and trivial
changes directly. A single-file or single-layer unit uses local planning, one
implementer, and local verification. Multi-layer or back-and-front changes use
the complete pipeline. Keep plans concise, group sequential units in the same
scope, and run cheap checks in the orchestrator.

Subagents do not communicate with one another or with David. The orchestrator
relays questions and results. Continue an existing subagent by ID instead of
starting an equivalent cold agent. Escalate real blockers with concrete
options, and summarize subagent reports before presenting them to David.

Use `$arquitectura-hexagonal` before work in `apps/back` and
`$arquitectura-frontend` before work in `apps/front`.

## Language policy

- Repository documentation, agent instructions, plans, new code identifiers,
  comments, commit messages, and operational output must be written in English.
- Localized product copy is the only exception. Every visible frontend string
  must use i18n and keep both `en.json` and `es.json` complete.
- Existing persisted domain literals and Spanish invoice-parsing fixtures are
  contracts or test data, not repository prose. Do not translate them without
  a dedicated migration.
- Do not preserve Spanish prose for historical consistency. Translate it when a
  touched document is still useful; delete it when it is obsolete.

## Documentation lifecycle

- `README.md` and `docs/architecture/` contain durable, versioned documentation.
  Keep them current, concise, and free of links to temporary plans.
- `docs/plans/` is temporary working state and is ignored by Git. A plan exists
  only while its task is active.
- After QA returns `PASS`, first move any durable decision into
  `docs/architecture/`, then delete the completed plan before staging commits.
  Delete abandoned or superseded plans as soon as the task is cancelled or
  replaced. The orchestrator owns this cleanup; do not wait for David to ask.
- A completed plan must never appear in `git status`, a commit, or a push.
- Before pushing, inspect `git status --short`, the staged file list, and the
  outgoing commits. Exclude temporary plans, secrets, local settings, generated
  outputs, downloaded skills, backups, logs, and editor or OS files.

## Durable conventions

- Do not add code comments, including JSDoc. Keep only directives required by
  lint or build, such as `eslint-disable` and `@ts-expect-error`. Express intent
  through names, types, and extraction; record rationale in commits, skills, or
  `docs/architecture/`.
- Use Conventional Commits in English:
  `type(scope): lowercase imperative summary`, with `feat`, `fix`, `refactor`,
  `docs`, or `chore`, and `front` or `back` where applicable. The body explains
  why and names important files or classes. Add
  `Co-Authored-By: OpenAI Codex <noreply@openai.com>`. Keep one logical change
  per commit and split backend from frontend. Before committing, inspect
  `git log -3 --format='---%n%B'`.
- `company` is a singleton. Do not add `companyId` to signatures or routes
  until the dedicated multi-tenant phase.

## Verification

```bash
pnpm i
pnpm --filter @ledgerly/back build
pnpm --filter @ledgerly/back test
pnpm --filter @ledgerly/back lint
pnpm --filter @ledgerly/front typecheck
pnpm --filter @ledgerly/front build
pnpm --filter @ledgerly/front lint
pnpm check:repo
```

pnpm 11 uses `allowBuilds:` in `pnpm-workspace.yaml` to approve installation
scripts. `onlyBuiltDependencies` is legacy and causes pnpm to rewrite the file
with placeholders.
