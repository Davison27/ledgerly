import 'dotenv/config';
import { runDatabaseMigrations } from './migrate';

async function bootstrap(): Promise<void> {
  await runDatabaseMigrations('auto');
}

void bootstrap();
