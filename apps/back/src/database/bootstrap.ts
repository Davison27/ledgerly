import 'dotenv/config';
import { getMigrations } from 'better-auth/db/migration';
import { auth } from '../lib/auth';
import dataSource from './data-source';

async function bootstrap(): Promise<void> {
  await dataSource.initialize();
  await dataSource.synchronize();
  const { runMigrations } = await getMigrations(auth.options);
  await runMigrations();
  await dataSource.destroy();
}

void bootstrap();
