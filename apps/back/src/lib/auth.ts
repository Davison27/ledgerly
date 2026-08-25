import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import { loadDatabaseRuntimeConfig } from '../config/database-runtime-config';

const databaseRuntimeConfig = loadDatabaseRuntimeConfig(process.env);

const pool = new Pool({
  host: databaseRuntimeConfig.host,
  port: databaseRuntimeConfig.port,
  user: databaseRuntimeConfig.username,
  password: databaseRuntimeConfig.password,
  database: databaseRuntimeConfig.database,
  max: databaseRuntimeConfig.authPoolMax,
  idleTimeoutMillis: databaseRuntimeConfig.idleTimeoutMillis,
  connectionTimeoutMillis: databaseRuntimeConfig.connectionTimeoutMillis,
  statement_timeout: databaseRuntimeConfig.statementTimeoutMillis,
  query_timeout: databaseRuntimeConfig.queryTimeoutMillis,
  application_name: 'ledgerly-auth',
});

export const authDatabase = new Kysely({ dialect: new PostgresDialect({ pool }) });

const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const backendUrl = process.env.BACKEND_PUBLIC_URL ?? 'http://localhost:3005';
const isProduction = process.env.NODE_ENV === 'production';
const frontendOrigin = new URL(frontendUrl).origin;
const logger = new Logger('AuthSecurityAudit');

async function recordSecurityAudit(event: string, subjectId: string | null): Promise<void> {
  try {
    await sql`
      INSERT INTO security_audit_logs (id, event, subject_id, metadata, created_at)
      VALUES (${randomUUID()}, ${event}, ${subjectId}, ${JSON.stringify({ outcome: 'success' })}::jsonb, NOW())
    `.execute(authDatabase);
  } catch {
    logger.warn('Security audit write failed');
  }
}

export const auth = betterAuth({
  appName: 'Ledgerly',
  baseURL: backendUrl,
  database: { db: authDatabase, type: 'postgres' },
  emailAndPassword: {
    enabled: false,
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
  trustedOrigins: [frontendOrigin],
  session: {
    expiresIn: 60 * 30,
    updateAge: 60 * 5,
    freshAge: 60 * 15,
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
    useSecureCookies: isProduction || process.env.COOKIE_SECURE === 'true',
    disableCSRFCheck: false,
    disableOriginCheck: false,
    trustedProxyHeaders: false,
    cookiePrefix: 'ledgerly',
    ipAddress: {
      disableIpTracking: false,
      ipAddressHeaders: ['x-forwarded-for'],
    },
  },
  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: false,
    },
  },
  logger: {
    level: 'error',
    log: () => logger.warn('Authentication request failed'),
  },
  onAPIError: {
    onError: () => logger.warn('Authentication request failed'),
  },
  databaseHooks: {
    session: {
      create: {
        after: async (session) =>
          recordSecurityAudit('session.created', session.userId),
      },
      delete: {
        before: async (session) => {
          await recordSecurityAudit('session.revoked', session.userId);
        },
      },
    },
    account: {
      create: {
        after: async (account) =>
          recordSecurityAudit('account.linked', account.userId),
      },
    },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
