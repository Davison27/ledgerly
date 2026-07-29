import 'reflect-metadata';
import 'dotenv/config';
import { join } from 'path';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? '5432'),
  username: process.env.DB_USER ?? 'ledgerly',
  password: process.env.DB_PASSWORD ?? 'ledgerly',
  database: process.env.DB_NAME ?? 'ledgerly',
  entities: [join(__dirname, '..', 'contexts', '**', '*.orm-entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
});
