import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? '5432'),
  username: process.env.DB_USER ?? 'ledgerly',
  password: process.env.DB_PASSWORD ?? 'ledgerly',
  database: process.env.DB_NAME ?? 'ledgerly',
  entities: ['src/contexts/**/*.orm-entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
});
