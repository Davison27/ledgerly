import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginAttempt } from '../../domain/login-attempt';
import { LoginAttemptRepository } from '../../domain/login-attempt.repository';
import { LoginAttemptMapper } from './login-attempt.mapper';
import { LoginAttemptOrmEntity } from './login-attempt.orm-entity';

interface ConsumedLoginAttemptRow {
  id: string;
  transaction_hash: string;
  state_hash: string;
  code_verifier: string;
  nonce: string;
  redirect_to: string;
  created_at: Date;
  expires_at: Date;
  consumed_at: Date | null;
}

@Injectable()
export class TypeOrmLoginAttemptRepository implements LoginAttemptRepository {
  constructor(
    @InjectRepository(LoginAttemptOrmEntity)
    private readonly repository: Repository<LoginAttemptOrmEntity>,
  ) {}

  async save(attempt: LoginAttempt): Promise<void> {
    await this.repository.save(LoginAttemptMapper.toOrm(attempt));
  }

  async consumeByTransactionHash(transactionHash: string, now: Date): Promise<LoginAttempt | null> {
    const rows = await this.repository.query<ConsumedLoginAttemptRow[]>(
      `UPDATE "oauth_login_attempts"
       SET "consumed_at" = $1
       WHERE "transaction_hash" = $2 AND "consumed_at" IS NULL
       RETURNING *`,
      [now, transactionHash],
    );

    const row = rows[0];

    if (!row) {
      return null;
    }

    return LoginAttempt.fromPrimitives({
      id: row.id,
      transactionHash: row.transaction_hash,
      stateHash: row.state_hash,
      codeVerifier: row.code_verifier,
      nonce: row.nonce,
      redirectTo: row.redirect_to,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      consumedAt: row.consumed_at,
    });
  }

  async deleteExpired(now: Date): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where('expires_at <= :now', { now })
      .execute();

    return result.affected ?? 0;
  }
}
