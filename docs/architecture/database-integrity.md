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
- Soft-deleted documents remain physical references for integrity and deletion
  decisions, but normal listings and financial projections exclude them.

## Derived and normalized data

Do not persist values that can be derived reliably from canonical data. A
document month comes from its date. Tax occurrence identity comes from its
stable obligation and period fields. Project equipment lease expenses are
individual rows rather than a mutable aggregate amount.

Clients are first-class records referenced by projects. Archived clients are
kept for historical references and excluded from active selection.

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
