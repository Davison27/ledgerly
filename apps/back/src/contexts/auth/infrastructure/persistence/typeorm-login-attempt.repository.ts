import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginAttempt } from '../../domain/login-attempt';
import { LoginAttemptRepository } from '../../domain/login-attempt.repository';
import { LoginAttemptMapper } from './login-attempt.mapper';
import { LoginAttemptOrmEntity } from './login-attempt.orm-entity';

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
    const rows = await this.repository.query<LoginAttemptOrmEntity[]>(
      `UPDATE "oauth_login_attempts"
       SET "consumed_at" = $1
       WHERE "transaction_hash" = $2 AND "consumed_at" IS NULL
       RETURNING
         "id",
         "transaction_hash" AS "transactionHash",
         "state_hash" AS "stateHash",
         "code_verifier" AS "codeVerifier",
         "nonce",
         "redirect_to" AS "redirectTo",
         "created_at" AS "createdAt",
         "expires_at" AS "expiresAt",
         "consumed_at" AS "consumedAt"`,
      [now, transactionHash],
    );

    const row = rows[0];

    if (!row) {
      return null;
    }

    return LoginAttemptMapper.toDomain(row);
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
