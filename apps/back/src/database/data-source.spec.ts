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

    expect(discoveredFiles).toEqual(
      expect.arrayContaining([
        '1730000000000-InitialLedgerlySchema.ts',
        '1730000001000-AddListQueryIndexes.ts',
        '1730000002000-AddEncryptedStoredFileEnvelopes.ts',
      ]),
    );
    expect(discoveredFiles).not.toContain('encrypted-stored-files.migration.e2e.spec.ts');
  });
});
