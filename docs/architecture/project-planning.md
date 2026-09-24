# Project planning

Planning is an optional project capability. Its top-level page manages global
checklist templates; each project keeps its own checklist and completion
state. Planning is a permission module, not a Workspace tab.

## Templates and project snapshots

Templates and their ordered items are stored separately from project
checklists in `project_checklist_templates`,
`project_checklist_template_items`, `project_checklists`, and
`project_checklist_items`.

Creating a project with a template, or first enabling Planning on an existing
project, copies the template name and ordered item text into project-owned rows
within the existing project transaction. The copy is independent: later
template edits or deletion do not change project data. The source-template
reference is provenance only and becomes null if that template is deleted.
Once assigned, a project's template cannot be replaced; users edit that
project's checklist directly.

Checklist items contain text, completion state, and position. They do not
change project status. The `planning_enabled` flag defaults to false. Turning
Planning off hides the checklist and its progress while retaining the project
snapshot and completed state for reactivation.

Checklist templates and project checklists enforce their text, identity,
membership, and ordering rules in domain aggregates. Persistence reconstitutes
them through validating factories, including when a template is copied into a
project snapshot.

## Access and summaries

Template reads require `planning:view`; template changes require
`planning:edit`. Reading a project checklist requires both `projects:view` and
`planning:view`. Checklist mutations require `projects:edit` and
`planning:edit`.

The project detail response exposes `checklistAssigned` only to members with
`planning:view`. This lets Settings distinguish an unassigned project from a
saved checklist that is currently disabled without returning the hidden item
contents. Progress counts are derived from checklist rows rather than stored
as counters. They are included only for enabled projects and members with
`planning:view`, and are aggregated separately from document summaries.
Project detail shows this progress to members with project and planning view
access even when they cannot view Dashboard. Dashboard financial queries and
values remain behind Dashboard access.
