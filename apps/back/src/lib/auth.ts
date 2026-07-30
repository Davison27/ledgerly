import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { betterAuth } from 'better-auth';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export const authDatabase = new Kysely({ dialect: new PostgresDialect({ pool }) });

const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const backendUrl = process.env.BACKEND_PUBLIC_URL ?? 'http://localhost:3005';

async function recordSecurityAudit(
  event: string,
  subjectId: string | null,
  metadata: Record<string, string | null>,
): Promise<void> {
  try {
    await sql`
      INSERT INTO security_audit_logs (id, event, subject_id, metadata, created_at)
      VALUES (${randomUUID()}, ${event}, ${subjectId}, ${JSON.stringify(metadata)}::jsonb, NOW())
    `.execute(authDatabase);
  } catch (error) {
    // Authentication must remain available if audit storage is temporarily unavailable.
    console.error('Failed to record security audit event', error);
  }
}

function requestMetadata(request: Request | undefined): Record<string, string | null> {
  const forwardedFor = request?.headers.get('x-forwarded-for');

  return {
    ipAddress: forwardedFor?.split(',')[0]?.trim() ?? request?.headers.get('x-real-ip') ?? null,
    userAgent: request?.headers.get('user-agent') ?? null,
  };
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
  trustedOrigins: [frontendUrl],
  session: {
    expiresIn: 60 * 60 * 24,
    updateAge: 60 * 60,
    freshAge: 60 * 60,
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
      ipAddressHeaders: ['x-forwarded-for', 'x-real-ip'],
    },
  },
  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: false,
    },
  },
  databaseHooks: {
    session: {
      create: {
        after: async (session, context) =>
          recordSecurityAudit('session.created', session.userId, {
            sessionId: session.id,
            ...requestMetadata(context?.request),
          }),
      },
      delete: {
        before: async (session, context) => {
          await recordSecurityAudit('session.revoked', session.userId, {
            sessionId: session.id,
            ...requestMetadata(context?.request),
          });
        },
      },
    },
    account: {
      create: {
        after: async (account, context) =>
          recordSecurityAudit('account.linked', account.userId, {
            accountId: account.id,
            provider: account.providerId,
            ...requestMetadata(context?.request),
          }),
      },
    },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
