export function migrationFailureMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown migration error';
}

export function reportMigrationFailure(error: unknown): void {
  process.stderr.write(`Migration failed: ${migrationFailureMessage(error)}\n`);
}
