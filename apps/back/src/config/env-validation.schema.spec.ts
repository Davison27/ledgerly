import { envValidationSchema } from './env-validation.schema';

const productionEnvironment = {
  NODE_ENV: 'production',
  DB_HOST: 'postgres',
  DB_PORT: 5432,
  DB_NAME: 'ledgerly',
  DB_USER: 'ledgerly',
  DB_PASSWORD: 'password',
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  BOOTSTRAP_ADMIN_EMAIL: 'admin@example.com',
  FRONTEND_URL: 'https://ledgerly.example.com',
  BACKEND_PUBLIC_URL: 'https://ledgerly.example.com',
  COOKIE_SECURE: true,
  TRUST_PROXY: true,
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
});
