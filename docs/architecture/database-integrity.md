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
- Referenced projects, suppliers, staff members, equipment, and clients are
  archived instead of being physically deleted.
- Document audit actors are nullable, indexed `ON DELETE RESTRICT` foreign keys
  from `documents.created_by` and `documents.deleted_by` to
  `workspace_members.id`. A legacy audit UUID with no matching member is
  normalized to `NULL`; `NULL` is the explicit unknown-actor value. Member
  removal therefore retains the membership row and its audit identity.
- Soft-deleted documents remain physical references for integrity and deletion
  decisions, but normal listings and financial projections exclude them.

The `PhysicalDocumentReferenceCounter` /
`countPhysicalDocumentReferences()` boundary supplies deletion-policy inputs
for projects, suppliers, and staff members. It counts physical `documents`
rows, including soft-deleted rows. Operational lists, summaries, and financial
readers apply `deleted_at IS NULL` and must not use this boundary as their
visibility query.

## Derived and normalized data

Do not persist values that can be derived reliably from canonical data. A
document month comes from its date. Tax occurrence identity comes from its
stable obligation and period fields. Project equipment lease expenses are
individual rows rather than a mutable aggregate amount.

Clients are first-class records referenced by projects. Archived clients are
kept for historical references and excluded from active selection.

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
- `db:verify` reports zero schema changes.
- The dedicated database E2E suite passes, including entity parity.
- All encrypted-envelope checks and expected foreign keys remain present.
