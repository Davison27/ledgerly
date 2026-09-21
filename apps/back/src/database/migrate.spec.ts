import { runMigrationCli } from './migration-cli';

describe('database migration CLI error reporting', () => {
  it('keeps the safe migration diagnostic in the executable wrapper', async () => {
    const write = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const previousExitCode = process.exitCode;
    const error = new Error(
      'Cannot enforce mandatory project client ownership: projects.client_id contains NULL values; assign every project an active client or reset and reseed the local database before retrying',
    );

    try {
      await runMigrationCli(() => Promise.reject(error));

      expect(process.exitCode).toBe(1);
      expect(write).toHaveBeenCalledWith(
        'Migration failed: Cannot enforce mandatory project client ownership: projects.client_id contains NULL values; assign every project an active client or reset and reseed the local database before retrying\n',
      );
      expect(write.mock.calls[0]?.[0]).not.toContain('stack');
    } finally {
      process.exitCode = previousExitCode;
      write.mockRestore();
    }
  });
});
