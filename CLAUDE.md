# Ledgerly

Read and follow [`AGENTS.md`](AGENTS.md) before doing any work. It is the single
source of truth for architecture, orchestration, language, documentation,
verification, and Git policy.

Claude-specific role profiles live in `.claude/agents/`. Their `opus` and
`sonnet` model aliases are compatibility settings for Claude Code only; the
canonical Codex assignments are defined in `AGENTS.md` and `.codex/agents/`.

In particular, every plan is temporary: create it under `docs/plans/` while the
task is active and delete it immediately after QA passes or the task is
abandoned. Never commit or push a plan.
