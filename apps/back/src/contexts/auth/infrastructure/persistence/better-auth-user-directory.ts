import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { authDatabase } from '../../../../lib/auth';
import { AuthUserDirectory, AuthUserIdentity } from '../../domain/auth-user-directory.port';

interface AuthUserRow {
  email: string;
  image: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  providers: string[] | null;
  activeSessions: string;
  lastSessionAt: Date | null;
}

@Injectable()
export class BetterAuthUserDirectory implements AuthUserDirectory {
  async findByEmails(emails: string[]): Promise<Map<string, AuthUserIdentity>> {
    if (emails.length === 0) {
      return new Map();
    }

    const result = await sql<AuthUserRow>`SELECT u.email, u.image, u."emailVerified", u."createdAt", u."updatedAt", ARRAY_REMOVE(ARRAY_AGG(DISTINCT a."providerId"), NULL) AS providers, COUNT(DISTINCT s.id) FILTER (WHERE s."expiresAt" > NOW()) AS "activeSessions", MAX(s."updatedAt") AS "lastSessionAt" FROM "user" u LEFT JOIN account a ON a."userId" = u.id LEFT JOIN session s ON s."userId" = u.id WHERE LOWER(u.email) IN (${sql.join(emails.map((email) => email.toLowerCase()))}) GROUP BY u.id`.execute(authDatabase);

    return new Map(result.rows.map((row) => [row.email.toLowerCase(), {
      image: row.image,
      emailVerified: row.emailVerified,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      providers: row.providers ?? [],
      activeSessions: Number(row.activeSessions),
      lastSessionAt: row.lastSessionAt,
    }]));
  }
}
