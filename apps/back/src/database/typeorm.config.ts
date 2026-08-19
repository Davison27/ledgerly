import { ConfigModule } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { loadDatabaseRuntimeConfig } from '../config/database-runtime-config';

export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  useFactory: () => {
    const databaseRuntimeConfig = loadDatabaseRuntimeConfig(process.env);

    return {
      type: 'postgres' as const,
      host: databaseRuntimeConfig.host,
      port: databaseRuntimeConfig.port,
      username: databaseRuntimeConfig.username,
      password: databaseRuntimeConfig.password,
      database: databaseRuntimeConfig.database,
      autoLoadEntities: true,
      synchronize: false,
      migrationsRun: false,
      extra: {
        max: databaseRuntimeConfig.typeormPoolMax,
        idleTimeoutMillis: databaseRuntimeConfig.idleTimeoutMillis,
        connectionTimeoutMillis: databaseRuntimeConfig.connectionTimeoutMillis,
        statement_timeout: databaseRuntimeConfig.statementTimeoutMillis,
        query_timeout: databaseRuntimeConfig.queryTimeoutMillis,
        application_name: 'ledgerly-back',
      },
    };
  },
};
