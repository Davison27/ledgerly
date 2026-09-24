# Ledgerly

Read and follow [`AGENTS.md`](AGENTS.md) before doing any work. It is the single
source of truth for architecture, orchestration, language, documentation,
verification, and Git policy.

Claude-specific role profiles live in `.claude/agents/` and set explicit Claude
model IDs and effort levels. The canonical Codex assignments are defined in
`AGENTS.md` and `.codex/agents/`.

Use the CodeGraph-first context and handoff workflow in `AGENTS.md`. The
orchestrator copies each implementation unit and its CodeGraph handoff into
each delegated task.

In particular, every plan is temporary: create it under `docs/plans/` while the
task is active and delete it immediately after QA passes or the task is
abandoned. Never commit or push a plan.
