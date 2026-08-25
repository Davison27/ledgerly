import 'reflect-metadata';
import 'dotenv/config';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { loadDatabaseRuntimeConfig } from '../config/database-runtime-config';

const databaseRuntimeConfig = loadDatabaseRuntimeConfig(process.env);

export default new DataSource({
  type: 'postgres',
  host: databaseRuntimeConfig.host,
  port: databaseRuntimeConfig.port,
  username: databaseRuntimeConfig.username,
  password: databaseRuntimeConfig.password,
  database: databaseRuntimeConfig.database,
  entities: [join(__dirname, '..', 'contexts', '**', '*.orm-entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '[0-9]*-*.{ts,js}')],
  migrationsRun: false,
  synchronize: false,
  extra: {
    max: databaseRuntimeConfig.migratorPoolMax,
    idleTimeoutMillis: databaseRuntimeConfig.idleTimeoutMillis,
    connectionTimeoutMillis: databaseRuntimeConfig.connectionTimeoutMillis,
    statement_timeout: databaseRuntimeConfig.statementTimeoutMillis,
    query_timeout: databaseRuntimeConfig.queryTimeoutMillis,
    application_name: 'ledgerly-migrator',
  },
});
