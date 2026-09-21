import { readdirSync } from 'node:fs';
import { join, matchesGlob } from 'node:path';

import dataSource from './data-source';

describe('database migration discovery', () => {
  it('discovers timestamped migrations without loading spec files', () => {
    const migrations = Array.isArray(dataSource.options.migrations) ? dataSource.options.migrations : [];
    const migrationPattern = migrations.find(
      (migration): migration is string => typeof migration === 'string',
    );

    if (!migrationPattern) throw new Error('Migration glob is not configured');

    const migrationDirectory = join(__dirname, 'migrations');
    const discoveredFiles = readdirSync(migrationDirectory).filter((fileName) =>
      matchesGlob(join(migrationDirectory, fileName), migrationPattern),
    );

    expect(discoveredFiles.toSorted()).toEqual(
      [
        '1730000000000-InitialLedgerlySchema.ts',
        '1730000001000-AddListQueryIndexes.ts',
        '1730000002000-AddEncryptedStoredFileEnvelopes.ts',
        '1730000003000-ReconcileEntitySchemaDrift.ts',
        '1730000004000-AddMissingUniqueConstraints.ts',
        '1730000005000-AddReferentialIntegrity.ts',
        '1730000006000-NormalizeDerivedColumns.ts',
        '1730000007000-AdoptEnglishControlledValues.ts',
      ].toSorted(),
    );
    expect(discoveredFiles).not.toContain('encrypted-stored-files.migration.e2e.spec.ts');
    expect(discoveredFiles).not.toContain('schema-parity.migration.e2e.spec.ts');
  });
});
