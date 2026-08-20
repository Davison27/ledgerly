import { MigrationInterface, QueryRunner } from 'typeorm';

type EncryptedStoredFileTable = {
  assetMimeTypeColumn: string | null;
  assetSizeColumn: string | null;
  keyVersionColumn: string;
  legacyColumn: string;
  legacyType: string;
  maximumSize: number;
  metadataMimeTypeColumn: string | null;
  metadataSizeColumn: string | null;
  nonceColumn: string;
  prefix: string;
  table: string;
  tagColumn: string;
};

const MAXIMUM_DOCUMENT_SIZE = 10 * 1024 * 1024;
const MAXIMUM_IMAGE_SIZE = 2 * 1024 * 1024;

const encryptedStoredFileTables: readonly EncryptedStoredFileTable[] = [
  {
    table: 'documents',
    prefix: 'content',
    legacyColumn: 'content',
    legacyType: 'bytea',
    nonceColumn: 'content_nonce',
    tagColumn: 'content_tag',
    keyVersionColumn: 'content_key_version',
    assetMimeTypeColumn: null,
    assetSizeColumn: null,
    metadataMimeTypeColumn: 'mime_type',
    metadataSizeColumn: 'file_size',
    maximumSize: MAXIMUM_DOCUMENT_SIZE,
  },
  {
    table: 'staff_documents',
    prefix: 'content',
    legacyColumn: 'content',
    legacyType: 'bytea',
    nonceColumn: 'content_nonce',
    tagColumn: 'content_tag',
    keyVersionColumn: 'content_key_version',
    assetMimeTypeColumn: null,
    assetSizeColumn: null,
    metadataMimeTypeColumn: 'mime_type',
    metadataSizeColumn: 'file_size',
    maximumSize: MAXIMUM_DOCUMENT_SIZE,
  },
  {
    table: 'companies',
    prefix: 'logo',
    legacyColumn: 'logo',
    legacyType: 'text',
    nonceColumn: 'logo_nonce',
    tagColumn: 'logo_tag',
    keyVersionColumn: 'logo_key_version',
    assetMimeTypeColumn: 'logo_mime_type',
    assetSizeColumn: 'logo_size',
    metadataMimeTypeColumn: null,
    metadataSizeColumn: null,
    maximumSize: MAXIMUM_IMAGE_SIZE,
  },
  {
    table: 'projects',
    prefix: 'image',
    legacyColumn: 'image',
    legacyType: 'text',
    nonceColumn: 'image_nonce',
    tagColumn: 'image_tag',
    keyVersionColumn: 'image_key_version',
    assetMimeTypeColumn: 'image_mime_type',
    assetSizeColumn: 'image_size',
    metadataMimeTypeColumn: null,
    metadataSizeColumn: null,
    maximumSize: MAXIMUM_IMAGE_SIZE,
  },
  {
    table: 'products',
    prefix: 'image',
    legacyColumn: 'image',
    legacyType: 'text',
    nonceColumn: 'image_nonce',
    tagColumn: 'image_tag',
    keyVersionColumn: 'image_key_version',
    assetMimeTypeColumn: 'image_mime_type',
    assetSizeColumn: 'image_size',
    metadataMimeTypeColumn: null,
    metadataSizeColumn: null,
    maximumSize: MAXIMUM_IMAGE_SIZE,
  },
];

export class AddEncryptedStoredFileEnvelopes1730000002000 implements MigrationInterface {
  name = 'AddEncryptedStoredFileEnvelopes1730000002000';
  transaction = true;

  async up(queryRunner: QueryRunner): Promise<void> {
    await assertLegacyColumnsAreEmpty(queryRunner);

    for (const table of encryptedStoredFileTables) {
      await queryRunner.query(buildEncryptedColumnReplacement(table));
      await queryRunner.query(buildEnvelopeCompletenessConstraint(table));
      await queryRunner.query(buildEnvelopeBoundsConstraint(table));
      if (table.metadataSizeColumn) {
        await queryRunner.query(buildMetadataSizeConstraint(table));
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await assertEncryptedColumnsAreEmpty(queryRunner);

    for (const table of [...encryptedStoredFileTables].reverse()) {
      await queryRunner.query(`ALTER TABLE "${table.table}" DROP CONSTRAINT "${envelopeConstraintName(table)}"`);
      await queryRunner.query(`ALTER TABLE "${table.table}" DROP CONSTRAINT "${boundsConstraintName(table)}"`);
      if (table.metadataSizeColumn) {
        await queryRunner.query(`ALTER TABLE "${table.table}" DROP CONSTRAINT "${metadataSizeConstraintName(table)}"`);
      }
      await queryRunner.query(buildLegacyColumnRestoration(table));
    }
  }
}

async function assertLegacyColumnsAreEmpty(queryRunner: QueryRunner): Promise<void> {
  const rows = (await queryRunner.query(
    `SELECT "table", "column"
     FROM (
       ${encryptedStoredFileTables
         .map(
           (table) =>
             `SELECT '${table.table}' AS "table", '${table.legacyColumn}' AS "column" FROM "${table.table}" WHERE "${table.legacyColumn}" IS NOT NULL`,
         )
         .join(' UNION ALL ')}
     ) AS legacy_stored_files
     LIMIT 1`,
  )) as Array<{ column: string; table: string }>;

  if (rows.length > 0) {
    throw new Error(`Encrypted stored-file migration requires empty legacy column ${rows[0].table}.${rows[0].column}`);
  }
}

async function assertEncryptedColumnsAreEmpty(queryRunner: QueryRunner): Promise<void> {
  const rows = (await queryRunner.query(
    `SELECT "table"
     FROM (
       ${encryptedStoredFileTables
         .map(
           (table) =>
             `SELECT '${table.table}' AS "table" FROM "${table.table}" WHERE ${encryptedColumns(table).map((column) => `"${column}" IS NOT NULL`).join(' OR ')}`,
         )
         .join(' UNION ALL ')}
     ) AS encrypted_stored_files
     LIMIT 1`,
  )) as Array<{ table: string }>;

  if (rows.length > 0) {
    throw new Error(`Encrypted stored-file migration cannot restore plaintext while ${rows[0].table} contains encrypted data`);
  }
}

function buildEncryptedColumnReplacement(table: EncryptedStoredFileTable): string {
  const columns = [
    `DROP COLUMN "${table.legacyColumn}"`,
    `ADD COLUMN "${ciphertextColumn(table)}" bytea`,
    `ADD COLUMN "${table.nonceColumn}" bytea`,
    `ADD COLUMN "${table.tagColumn}" bytea`,
    `ADD COLUMN "${table.keyVersionColumn}" varchar(10)`,
  ];

  if (table.assetMimeTypeColumn && table.assetSizeColumn) {
    columns.push(`ADD COLUMN "${table.assetMimeTypeColumn}" varchar(127)`, `ADD COLUMN "${table.assetSizeColumn}" integer`);
  }

  return `ALTER TABLE "${table.table}" ${columns.join(', ')}`;
}

function buildLegacyColumnRestoration(table: EncryptedStoredFileTable): string {
  return `ALTER TABLE "${table.table}" DROP COLUMN "${ciphertextColumn(table)}", DROP COLUMN "${table.nonceColumn}", DROP COLUMN "${table.tagColumn}", DROP COLUMN "${table.keyVersionColumn}"${
    table.assetMimeTypeColumn && table.assetSizeColumn
      ? `, DROP COLUMN "${table.assetMimeTypeColumn}", DROP COLUMN "${table.assetSizeColumn}"`
      : ''
  }, ADD COLUMN "${table.legacyColumn}" ${table.legacyType}`;
}

function buildEnvelopeCompletenessConstraint(table: EncryptedStoredFileTable): string {
  const columns = encryptedColumns(table);
  return `ALTER TABLE "${table.table}" ADD CONSTRAINT "${envelopeConstraintName(table)}" CHECK ((${columns.map((column) => `"${column}" IS NULL`).join(' AND ')}) OR (${columns.map((column) => `"${column}" IS NOT NULL`).join(' AND ')}))`;
}

function buildEnvelopeBoundsConstraint(table: EncryptedStoredFileTable): string {
  const sizeColumn = table.assetSizeColumn ?? table.metadataSizeColumn;
  const mimeTypeColumn = table.assetMimeTypeColumn ?? table.metadataMimeTypeColumn;
  const requirements = [
    `octet_length("${table.nonceColumn}") = 12`,
    `octet_length("${table.tagColumn}") = 16`,
    `"${table.keyVersionColumn}" ~ '^v[1-9][0-9]{0,8}$'`,
    `"${sizeColumn}" IS NOT NULL`,
    `"${sizeColumn}" >= 0`,
    `"${sizeColumn}" <= ${table.maximumSize}`,
    `octet_length("${ciphertextColumn(table)}") = "${sizeColumn}"`,
  ];

  if (mimeTypeColumn) {
    requirements.push(`"${mimeTypeColumn}" IS NOT NULL`, `octet_length("${mimeTypeColumn}") <= 127`);
  }
  if (table.assetMimeTypeColumn) {
    requirements.push(`"${table.assetMimeTypeColumn}" IN ('image/png', 'image/jpeg', 'image/webp')`);
  }

  return `ALTER TABLE "${table.table}" ADD CONSTRAINT "${boundsConstraintName(table)}" CHECK ("${ciphertextColumn(table)}" IS NULL OR (${requirements.join(' AND ')}))`;
}

function buildMetadataSizeConstraint(table: EncryptedStoredFileTable): string {
  return `ALTER TABLE "${table.table}" ADD CONSTRAINT "${metadataSizeConstraintName(table)}" CHECK ("${table.metadataSizeColumn}" IS NULL OR ("${table.metadataSizeColumn}" >= 0 AND "${table.metadataSizeColumn}" <= ${table.maximumSize}))`;
}

function encryptedColumns(table: EncryptedStoredFileTable): string[] {
  const columns = [ciphertextColumn(table), table.nonceColumn, table.tagColumn, table.keyVersionColumn];
  if (table.assetMimeTypeColumn && table.assetSizeColumn) {
    columns.push(table.assetMimeTypeColumn, table.assetSizeColumn);
  }
  return columns;
}

function ciphertextColumn(table: EncryptedStoredFileTable): string {
  return `${table.prefix}_ciphertext`;
}

function envelopeConstraintName(table: EncryptedStoredFileTable): string {
  return `CHK_${table.table}_${table.prefix}_envelope`;
}

function boundsConstraintName(table: EncryptedStoredFileTable): string {
  return `CHK_${table.table}_${table.prefix}_bounds`;
}

function metadataSizeConstraintName(table: EncryptedStoredFileTable): string {
  return `CHK_${table.table}_${table.prefix}_metadata_size`;
}
