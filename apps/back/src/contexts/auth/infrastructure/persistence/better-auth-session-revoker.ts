import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { authDatabase } from '../../../../lib/auth';
import { AuthSessionRevoker } from '../../domain/auth-session-revoker.port';

@Injectable()
export class BetterAuthSessionRevoker implements AuthSessionRevoker {
  async revokeAllForEmail(email: string): Promise<void> {
    await sql`DELETE FROM "session" WHERE "userId" IN (SELECT id FROM "user" WHERE email = ${email})`.execute(authDatabase);
  }
}
