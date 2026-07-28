import { LoginAttempt } from './login-attempt';

export const LOGIN_ATTEMPT_REPOSITORY = Symbol('LoginAttemptRepository');

export interface LoginAttemptRepository {
  save(attempt: LoginAttempt): Promise<void>;
  consumeByTransactionHash(transactionHash: string, now: Date): Promise<LoginAttempt | null>;
  deleteExpired(now: Date): Promise<number>;
}
