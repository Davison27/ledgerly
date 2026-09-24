---
name: codegraph
description: Find indexed source and trace code relationships with CodeGraph while keeping task context focused.
---

# CodeGraph

Use CodeGraph before searching for or opening indexed source. Prefer the
`codegraph_explore` MCP tool when available; use the CLI otherwise. Treat
returned source as already read. Read files directly for unindexed material
such as plans, documentation, or configuration, or to resolve a specific gap.

## Pick the smallest useful query

- `codegraph context "task description" --max-nodes 20` finds task-relevant
  symbols, relationships, and source; add `--no-code` for structure only.
- `codegraph explore "Controller UseCase Repository" --max-files 8` returns
  relevant source and call paths. Name known symbols or files in the query.
- `codegraph query "symbolName" --kind function --limit 10` finds symbols;
  `codegraph node symbolName` shows one symbol with its callers and callees.
- `codegraph node --file path/to/file.ts --offset 40 --limit 80` reads a
  focused indexed file range and its dependents.
- Use `codegraph callers symbolName`, `codegraph callees symbolName`, and
  `codegraph impact symbolName --depth 3` to trace behavior and change impact.
- Use `codegraph affected path/to/changed-file.ts` to find likely affected
  tests, and `codegraph files --filter path/to/area --format grouped` to inspect
  indexed project structure.

Check `codegraph status` when freshness is uncertain. Use `codegraph sync` for
incremental updates when needed; reserve full `codegraph index` for repair.
Keep results focused and cite exact paths, symbols, and relevant findings in
plans and handoffs. A planner's `CodeGraph handoff` carries behavior and
contracts, flow and callers, affected tests, and stale or missing-context
caveats; the orchestrator copies it into each delegated task. Follow-up queries
should fill concrete gaps without repeating broad exploration. CodeGraph does
not replace review or build, test, typecheck, and lint verification.
