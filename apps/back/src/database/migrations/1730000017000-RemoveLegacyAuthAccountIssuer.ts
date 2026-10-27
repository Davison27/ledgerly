import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveLegacyAuthAccountIssuer1730000017000 implements MigrationInterface {
  name = 'RemoveLegacyAuthAccountIssuer1730000017000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $migration$
      DECLARE
        target_schema text := current_schema();
        duplicate_identities boolean;
        identity_index_matches boolean;
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = target_schema AND table_name = 'account'
        ) AND EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = target_schema AND table_name = 'account' AND column_name = 'issuer'
        ) THEN
          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = target_schema AND table_name = 'account' AND column_name = 'providerId'
          ) OR NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = target_schema AND table_name = 'account' AND column_name = 'accountId'
          ) THEN
            RAISE EXCEPTION 'Cannot remove account.issuer because account identity columns are missing';
          END IF;

          EXECUTE format(
            'SELECT EXISTS (SELECT 1 FROM %I.%I GROUP BY %I, %I HAVING count(*) > 1)',
            target_schema,
            'account',
            'providerId',
            'accountId'
          ) INTO duplicate_identities;

          IF duplicate_identities THEN
            RAISE EXCEPTION 'Cannot remove account.issuer while duplicate (providerId, accountId) identities exist';
          END IF;

          EXECUTE format(
            'CREATE UNIQUE INDEX IF NOT EXISTS %I ON %I.%I (%I, %I)',
            'account_providerId_accountId_uidx',
            target_schema,
            'account',
            'providerId',
            'accountId'
          );

          SELECT EXISTS (
            SELECT 1
            FROM pg_class index_relation
            JOIN pg_namespace index_schema ON index_schema.oid = index_relation.relnamespace
            JOIN pg_index index_definition ON index_definition.indexrelid = index_relation.oid
            JOIN pg_class indexed_table ON indexed_table.oid = index_definition.indrelid
            WHERE index_schema.nspname = target_schema
              AND index_relation.relname = 'account_providerId_accountId_uidx'
              AND index_relation.relkind = 'i'
              AND indexed_table.relnamespace = index_schema.oid
              AND indexed_table.relname = 'account'
              AND index_definition.indisunique
              AND index_definition.indisvalid
              AND index_definition.indisready
              AND index_definition.indpred IS NULL
              AND index_definition.indexprs IS NULL
              AND index_definition.indnkeyatts = 2
              AND index_definition.indnatts = 2
              AND ARRAY(
                SELECT indexed_column.attname::text
                FROM unnest(index_definition.indkey) WITH ORDINALITY AS index_columns(attnum, ordinal)
                JOIN pg_attribute indexed_column
                  ON indexed_column.attrelid = index_definition.indrelid
                 AND indexed_column.attnum = index_columns.attnum
                ORDER BY index_columns.ordinal
              ) = ARRAY['providerId', 'accountId']::text[]
          ) INTO identity_index_matches;

          IF NOT identity_index_matches THEN
            RAISE EXCEPTION 'Index account_providerId_accountId_uidx exists with an incompatible definition';
          END IF;

          EXECUTE format('ALTER TABLE %I.%I DROP COLUMN %I', target_schema, 'account', 'issuer');
        END IF;
      END
      $migration$
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $migration$
      DECLARE
        target_schema text := current_schema();
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = target_schema AND table_name = 'account'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = target_schema AND table_name = 'account' AND column_name = 'issuer'
        ) THEN
          EXECUTE format('ALTER TABLE %I.%I ADD COLUMN %I text', target_schema, 'account', 'issuer');
        END IF;
      END
      $migration$
    `);
  }
}
