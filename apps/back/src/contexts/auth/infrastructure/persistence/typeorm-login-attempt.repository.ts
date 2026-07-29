import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginAttempt } from '../../domain/login-attempt';
import { LoginAttemptRepository } from '../../domain/login-attempt.repository';
import { LoginAttemptMapper } from './login-attempt.mapper';
import { LoginAttemptOrmEntity } from './login-attempt.orm-entity';

interface ConsumedLoginAttemptRow {
  [key: string]: unknown;
}

type ConsumedLoginAttemptQueryResult =
  | ConsumedLoginAttemptRow[]
  | [ConsumedLoginAttemptRow[], number];

function readColumn<T>(row: ConsumedLoginAttemptRow, snakeCase: string, camelCase: string): T {
  if (snakeCase in row) {
    return row[snakeCase] as T;
  }

  if (camelCase in row) {
    return row[camelCase] as T;
  }

  throw new Error(`Consumed OAuth login attempt is missing ${snakeCase}; received fields: ${Object.keys(row).join(', ')}`);
}

function firstConsumedAttemptRow(
  result: ConsumedLoginAttemptQueryResult,
): ConsumedLoginAttemptRow | undefined {
  const first = result[0];

  return Array.isArray(first) ? first[0] : first;
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
    const result = await this.repository.query<ConsumedLoginAttemptQueryResult>(
      `UPDATE "oauth_login_attempts"
       SET "consumed_at" = $1
       WHERE "transaction_hash" = $2 AND "consumed_at" IS NULL
       RETURNING *`,
      [now, transactionHash],
    );

    const row = firstConsumedAttemptRow(result);

    if (!row) {
      return null;
    }

    return LoginAttempt.fromPrimitives({
      id: readColumn<string>(row, 'id', 'id'),
      transactionHash: readColumn<string>(row, 'transaction_hash', 'transactionHash'),
      stateHash: readColumn<string>(row, 'state_hash', 'stateHash'),
      codeVerifier: readColumn<string>(row, 'code_verifier', 'codeVerifier'),
      nonce: readColumn<string>(row, 'nonce', 'nonce'),
      redirectTo: readColumn<string>(row, 'redirect_to', 'redirectTo'),
      createdAt: readColumn<Date>(row, 'created_at', 'createdAt'),
      expiresAt: readColumn<Date>(row, 'expires_at', 'expiresAt'),
      consumedAt: readColumn<Date | null>(row, 'consumed_at', 'consumedAt'),
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
