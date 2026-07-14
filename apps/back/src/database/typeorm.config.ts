import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';

export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: Number(config.get<string>('DB_PORT', '5432')),
    username: config.get<string>('DB_USER', 'ledgerly'),
    password: config.get<string>('DB_PASSWORD', 'ledgerly'),
    database: config.get<string>('DB_NAME', 'ledgerly'),
    autoLoadEntities: true,
    synchronize: false,
    migrationsRun: false,
  }),
};
