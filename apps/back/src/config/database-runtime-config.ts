import type { ValidationError } from 'joi';
import { envValidationSchema } from './env-validation.schema';

export interface DatabaseRuntimeConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  typeormPoolMax: number;
  authPoolMax: number;
  migratorPoolMax: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  statementTimeoutMillis: number;
  queryTimeoutMillis: number;
  connectionBudget: number;
  requiredConnections: number;
}

interface ValidatedDatabaseEnvironment {
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_TYPEORM_POOL_MAX: number;
  DB_AUTH_POOL_MAX: number;
  DB_MIGRATOR_POOL_MAX: number;
  DB_IDLE_TIMEOUT_MS: number;
  DB_CONNECTION_TIMEOUT_MS: number;
  DB_STATEMENT_TIMEOUT_MS: number;
  DB_QUERY_TIMEOUT_MS: number;
  DB_CONNECTION_BUDGET: number;
}

function formatValidationError(error: ValidationError): string {
  const invalidKeys = [...new Set(error.details.map((detail) => detail.path.join('.')))].join(', ');

  return `Environment configuration is invalid: ${invalidKeys}`;
}

export function loadDatabaseRuntimeConfig(environment: Record<string, unknown>): DatabaseRuntimeConfig {
  const validation = envValidationSchema.validate(environment, {
    abortEarly: false,
    allowUnknown: true,
  });

  if (validation.error) {
    throw new Error(formatValidationError(validation.error));
  }

  const value = validation.value as unknown as ValidatedDatabaseEnvironment;

  const requiredConnections =
    value.DB_TYPEORM_POOL_MAX + value.DB_AUTH_POOL_MAX + value.DB_MIGRATOR_POOL_MAX * 2 + 1;

  if (requiredConnections > value.DB_CONNECTION_BUDGET) {
    throw new Error(
      `DB_CONNECTION_BUDGET must be at least ${requiredConnections} for the configured connection reservation`,
    );
  }

  return {
    host: value.DB_HOST,
    port: value.DB_PORT,
    database: value.DB_NAME,
    username: value.DB_USER,
    password: value.DB_PASSWORD,
    typeormPoolMax: value.DB_TYPEORM_POOL_MAX,
    authPoolMax: value.DB_AUTH_POOL_MAX,
    migratorPoolMax: value.DB_MIGRATOR_POOL_MAX,
    idleTimeoutMillis: value.DB_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: value.DB_CONNECTION_TIMEOUT_MS,
    statementTimeoutMillis: value.DB_STATEMENT_TIMEOUT_MS,
    queryTimeoutMillis: value.DB_QUERY_TIMEOUT_MS,
    connectionBudget: value.DB_CONNECTION_BUDGET,
    requiredConnections,
  };
}
