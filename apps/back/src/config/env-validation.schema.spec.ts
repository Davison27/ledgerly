import { envValidationSchema } from './env-validation.schema';
import { loadDatabaseRuntimeConfig } from './database-runtime-config';

const productionEnvironment = {
  NODE_ENV: 'production',
  DB_HOST: 'postgres',
  DB_PORT: 5432,
  DB_NAME: 'ledgerly',
  DB_USER: 'ledgerly',
  DB_PASSWORD: 'password',
  DB_TYPEORM_POOL_MAX: 8,
  DB_AUTH_POOL_MAX: 4,
  DB_MIGRATOR_POOL_MAX: 2,
  DB_IDLE_TIMEOUT_MS: 30_000,
  DB_CONNECTION_TIMEOUT_MS: 5_000,
  DB_STATEMENT_TIMEOUT_MS: 30_000,
  DB_QUERY_TIMEOUT_MS: 30_000,
  DB_CONNECTION_BUDGET: 17,
  BETTER_AUTH_SECRET: 'a-secure-authentication-secret-value',
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  BOOTSTRAP_ADMIN_EMAIL: 'admin@example.com',
  FRONTEND_URL: 'https://ledgerly.example.com',
  BACKEND_PUBLIC_URL: 'https://ledgerly.example.com',
  COOKIE_SECURE: true,
  TRUST_PROXY: true,
  STORED_FILE_ACTIVE_KEY_VERSION: 'v1',
  STORED_FILE_KEYS: JSON.stringify({ v1: Buffer.alloc(32, 0x11).toString('base64') }),
};

describe('envValidationSchema', () => {
  it.each([
    ['FRONTEND_URL', 'http://ledgerly.example.com'],
    ['BACKEND_PUBLIC_URL', 'http://ledgerly.example.com'],
  ])('rejects an insecure production %s', (key, value) => {
    const { error } = envValidationSchema.validate({ ...productionEnvironment, [key]: value });

    expect(error).toBeDefined();
  });

  it('rejects production deployments that do not trust the reverse proxy', () => {
    const { error } = envValidationSchema.validate({ ...productionEnvironment, TRUST_PROXY: false });

    expect(error).toBeDefined();
  });

  it('accepts the required production transport configuration', () => {
    const { error } = envValidationSchema.validate(productionEnvironment);

    expect(error).toBeUndefined();
  });

  it.each(['STORED_FILE_ACTIVE_KEY_VERSION', 'STORED_FILE_KEYS'])('rejects a missing %s', (key) => {
    const environment = { ...productionEnvironment };
    delete environment[key as keyof typeof environment];

    const { error } = envValidationSchema.validate(environment);

    expect(error).toBeDefined();
  });

  it('loads bounded pool settings from the validated environment', () => {
    const runtimeConfig = loadDatabaseRuntimeConfig(productionEnvironment);

    expect(runtimeConfig).toMatchObject({
      typeormPoolMax: 8,
      authPoolMax: 4,
      migratorPoolMax: 2,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      statementTimeoutMillis: 30_000,
      queryTimeoutMillis: 30_000,
      connectionBudget: 17,
      requiredConnections: 17,
    });
  });

  it('rejects a connection budget below the required pool reservation', () => {
    expect(() =>
      loadDatabaseRuntimeConfig({ ...productionEnvironment, DB_CONNECTION_BUDGET: 16 }),
    ).toThrow('DB_CONNECTION_BUDGET');
  });
});
