import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const database = new Kysely({ dialect: new PostgresDialect({ pool }) });

const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const backendUrl = process.env.BACKEND_PUBLIC_URL ?? 'http://localhost:3005';

export const auth = betterAuth({
  appName: 'Ledgerly',
  baseURL: backendUrl,
  database: { db: database, type: 'postgres' },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 30,
  },
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : undefined,
  trustedOrigins: [frontendUrl],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    storage: 'database',
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 60, max: 5 },
      '/forget-password': { window: 60 * 15, max: 3 },
      '/reset-password': { window: 60 * 15, max: 5 },
    },
  },
  advanced: {
    useSecureCookies: process.env.COOKIE_SECURE === 'true',
    disableCSRFCheck: false,
    disableOriginCheck: false,
    cookiePrefix: 'ledgerly',
    ipAddress: {
      disableIpTracking: false,
      ipAddressHeaders: process.env.TRUST_PROXY === 'true' ? ['x-forwarded-for', 'x-real-ip'] : [],
    },
  },
  account: {
    accountLinking: {
      enabled: false,
    },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
