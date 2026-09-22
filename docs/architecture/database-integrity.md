# Database integrity

Ledgerly treats PostgreSQL constraints and TypeORM metadata as two views of the
same data contract. Migrations are authoritative for deployed databases, while
entities must describe the same final schema so `db:verify` produces no up or
down queries.

## Constraint ownership

Foreign keys, unique indexes, and domain checks are part of the application
contract. Add them through reversible migrations and mirror them in TypeORM
metadata. Never resolve schema drift by dropping a valid integrity constraint.

The 18 `CHK_*` constraints protecting encrypted file and image envelopes are a
security boundary. They require either a complete authenticated encryption
envelope or no envelope at all. Every schema change must preserve all 18.

Foreign-key delete actions express lifecycle policy:

- Composition rows cascade when their owning aggregate is deleted.
- Historical and financial references restrict physical deletion.
- Referenced projects, suppliers, staff members, and equipment are archived
  instead of being physically deleted.
- `projects.client_id` is mandatory and uses `FK_projects_client` with
  `ON DELETE RESTRICT`, backed by `IDX_projects_client_id`. A client with
  projects is archived; an unreferenced client may be physically deleted by
  the client lifecycle operation. Client deletion never cascades or reassigns
  projects.
- Document audit actors are nullable, indexed `ON DELETE RESTRICT` foreign keys
  from `documents.created_by` and `documents.deleted_by` to
  `workspace_members.id`. A legacy audit UUID with no matching member is
  normalized to `NULL`; `NULL` is the explicit unknown-actor value. Member
  removal therefore retains the membership row and its audit identity.
- `release_note_acknowledgements` stores only
  `(workspace_member_id, release_version, acknowledged_at)`, keyed by
  `(workspace_member_id, release_version)` with the named composite primary
  key `PK_release_note_acknowledgements`. This allows one durable
  acknowledgement per member and release while keeping release copy in the
  frontend's static catalogue. Its named
  `FK_release_note_acknowledgements_workspace_member` cascades only when a
  workspace member is physically deleted; normal member removal disables and
  retains the member. The named
  `CHK_release_note_acknowledgements_version` permits stable SemVer values
  without leading zeroes, prerelease suffixes, or build metadata. The composite
  primary key also supplies the member/version lookup index.
- Soft-deleted documents remain physical references for integrity and deletion
  decisions, but normal listings and financial projections exclude them.

The `PhysicalDocumentReferenceCounter` /
`countPhysicalDocumentReferences()` boundary supplies deletion-policy inputs
for projects, suppliers, and staff members. It counts physical `documents`
rows, including soft-deleted rows. Operational lists, summaries, and financial
readers apply `deleted_at IS NULL` and must not use this boundary as their
visibility query.

Project creation and an actual client reassignment lock the target client row
in a transaction and require that client to be active. Client deletion or
archival takes the same lock before counting project references. The lock
serializes both operation orders: a winning assignment can be followed by
archival, while a winning delete/archive causes a waiting assignment to return
not-found or archived-client conflict. An update that preserves the current
parent does not revalidate an archived client, so historical projects remain
editable for unrelated fields.

## Derived and normalized data

Do not persist values that can be derived reliably from canonical data. A
document month comes from its date. Tax occurrence identity comes from its
stable obligation and period fields. Project equipment lease expenses are
individual rows rather than a mutable aggregate amount.

Clients are first-class records referenced by projects. Project summaries derive
client project counts from `projects.client_id`; no counter is stored. Archived
clients are kept for historical references, excluded from active assignment
selectors, and remain available to historical scoped views.

Documents keep `documents.project_id` as their sole ownership reference. A
global document client filter resolves through the related project's
`projects.client_id` using a join or `EXISTS` predicate. Combining client and
project filters is conjunctive, and no denormalized `documents.client_id` is
stored.

Client and supplier tax IDs use one canonical representation: trim, uppercase,
remove spaces, hyphens, and periods, and convert an empty result to `NULL`.
Each table has a partial unique index over non-null `tax_id`; `NULL` remains
repeatable and archived rows continue to reserve their canonical IDs. Friendly
application prechecks are complemented by PostgreSQL uniqueness for concurrent
writes. Client and supplier uniqueness is enforced independently.

Staff employment and archive lifecycles are independent. `endDate` records the
employment end date and may be set, changed, or cleared subject to date
validity and ordering. `archivedAt` controls visibility and deletion lifecycle;
archiving or unarchiving never changes employment dates, and changing an end
date never archives or unarchives a staff member.

Project dashboards and financial reporting derive their selected year from
document dates and lease-expense dates, so `projects.fiscal_year` is not part
of the current contract. Its removal is authorized and intentionally discards
the obsolete stored values; a schema rollback can restore only a nullable empty
column. The tax-compliance setting
`tax_client_profiles.fiscal_year_start_month` remains supported and is
unrelated to project reporting.

## Language boundaries

Application-controlled persisted values and API machine values use English.
This includes document types, directions, statuses, and tax profile entity
types. The frontend maps stable values and opaque catalog keys to visible copy
through `en.json` and `es.json`.

Do not translate customer-authored fields, source document text, invoice parser
patterns, country and format codes, or opaque identifiers owned by external
systems. Historical migrations may retain superseded literals because their
contents must remain immutable; a later migration performs any required data
conversion.

## Verification

Database changes must prove all of the following:

- Migrations apply from an empty PostgreSQL database.
- Reversible migrations restore the preceding schema and data contract.
- The mandatory project-client migration fails safely when an existing local
  database still contains null parents; it does not invent a fallback client.
- `db:verify` reports zero schema changes.
- The dedicated database E2E suite passes, including entity parity.
- All encrypted-envelope checks and expected foreign keys remain present.
