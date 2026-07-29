import { Repository } from 'typeorm';
import { LoginAttemptOrmEntity } from './login-attempt.orm-entity';
import { TypeOrmLoginAttemptRepository } from './typeorm-login-attempt.repository';

describe('TypeOrmLoginAttemptRepository', () => {
  it('maps the snake_case fields returned by PostgreSQL when consuming an attempt', async () => {
    const consumedAt = new Date('2026-07-29T15:32:43.000Z');
    const repository = {
      query: jest.fn().mockResolvedValue([
        {
          id: 'attempt-1',
          transaction_hash: 'transaction-hash',
          state_hash: 'state-hash',
          code_verifier: 'code-verifier',
          nonce: 'nonce',
          redirect_to: '/dashboard',
          created_at: new Date('2026-07-29T15:30:00.000Z'),
          expires_at: new Date('2026-07-29T15:40:00.000Z'),
          consumed_at: consumedAt,
        },
      ]),
    } as unknown as Repository<LoginAttemptOrmEntity>;
    const loginAttemptRepository = new TypeOrmLoginAttemptRepository(repository);

    const attempt = await loginAttemptRepository.consumeByTransactionHash(
      'transaction-hash',
      consumedAt,
    );

    expect(attempt?.getCodeVerifier()).toBe('code-verifier');
    expect(attempt?.getNonce()).toBe('nonce');
    expect(attempt?.getRedirectTo()).toBe('/dashboard');
    expect(attempt?.getConsumedAt()).toEqual(consumedAt);
    expect(attempt?.isExpired(new Date('2026-07-29T15:39:59.999Z'))).toBe(false);
    expect(attempt?.isExpired(new Date('2026-07-29T15:40:00.000Z'))).toBe(true);
  });

  it('maps the aliases returned by TypeORM when consuming an attempt', async () => {
    const consumedAt = new Date('2026-07-29T15:32:43.000Z');
    const repository = {
      query: jest.fn().mockResolvedValue([
        {
          id: 'attempt-1',
          transactionHash: 'transaction-hash',
          stateHash: 'state-hash',
          codeVerifier: 'code-verifier',
          nonce: 'nonce',
          redirectTo: '/dashboard',
          createdAt: new Date('2026-07-29T15:30:00.000Z'),
          expiresAt: new Date('2026-07-29T15:40:00.000Z'),
          consumedAt,
        },
      ]),
    } as unknown as Repository<LoginAttemptOrmEntity>;
    const loginAttemptRepository = new TypeOrmLoginAttemptRepository(repository);

    const attempt = await loginAttemptRepository.consumeByTransactionHash(
      'transaction-hash',
      consumedAt,
    );

    expect(attempt?.isExpired(new Date('2026-07-29T15:40:00.000Z'))).toBe(true);
  });

  it('unwraps the tuple returned by TypeORM for an update query', async () => {
    const consumedAt = new Date('2026-07-29T15:32:43.000Z');
    const repository = {
      query: jest.fn().mockResolvedValue([
        [
          {
            id: 'attempt-1',
            transaction_hash: 'transaction-hash',
            state_hash: 'state-hash',
            code_verifier: 'code-verifier',
            nonce: 'nonce',
            redirect_to: '/dashboard',
            created_at: new Date('2026-07-29T15:30:00.000Z'),
            expires_at: new Date('2026-07-29T15:40:00.000Z'),
            consumed_at: consumedAt,
          },
        ],
        1,
      ]),
    } as unknown as Repository<LoginAttemptOrmEntity>;
    const loginAttemptRepository = new TypeOrmLoginAttemptRepository(repository);

    const attempt = await loginAttemptRepository.consumeByTransactionHash(
      'transaction-hash',
      consumedAt,
    );

    expect(attempt?.getCodeVerifier()).toBe('code-verifier');
    expect(attempt?.isExpired(new Date('2026-07-29T15:40:00.000Z'))).toBe(true);
  });
});
