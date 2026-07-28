import { StartGoogleLoginUseCase } from './start-google-login.use-case';
import {
  GoogleAuthorizationUrlParams,
  GoogleIdentity,
  GoogleIdentityResult,
  GooglePkcePair,
} from '../../domain/google-identity.port';
import { LoginAttempt } from '../../domain/login-attempt';
import { LoginAttemptRepository } from '../../domain/login-attempt.repository';
import { TokenGenerator } from '../../domain/token-generator.port';
import { Clock } from '../../../../shared/domain/clock.port';
import { IdGenerator } from '../../../../shared/domain/id-generator.port';

class InMemoryLoginAttemptRepository implements LoginAttemptRepository {
  saved: LoginAttempt[] = [];

  save(attempt: LoginAttempt): Promise<void> {
    this.saved.push(attempt);
    return Promise.resolve();
  }

  consumeByTransactionHash(): Promise<LoginAttempt | null> {
    return Promise.resolve(null);
  }

  deleteExpired(): Promise<number> {
    return Promise.resolve(0);
  }
}

class FakeGoogleIdentity implements GoogleIdentity {
  public receivedParams: GoogleAuthorizationUrlParams | undefined;

  generatePkcePair(): Promise<GooglePkcePair> {
    return Promise.resolve({ codeVerifier: 'verifier', codeChallenge: 'challenge' });
  }

  buildAuthorizationUrl(params: GoogleAuthorizationUrlParams): string {
    this.receivedParams = params;
    return `https://accounts.google.com/o/oauth2/v2/auth?state=${params.state}&nonce=${params.nonce}&code_challenge=${params.codeChallenge}&code_challenge_method=S256`;
  }

  exchangeCode(): Promise<GoogleIdentityResult> {
    throw new Error('not implemented');
  }
}

class FakeTokenGenerator implements TokenGenerator {
  private counter = 0;

  generateOpaqueToken(): string {
    this.counter += 1;
    return `token-${this.counter}`;
  }

  hash(value: string): string {
    return `hash(${value})`;
  }

  hashesMatch(hash: string, candidate: string): boolean {
    return hash === candidate;
  }
}

class FixedClock implements Clock {
  constructor(private readonly value: Date) {}

  now(): Date {
    return this.value;
  }

  todayIso(): string {
    return this.value.toISOString().slice(0, 10);
  }
}

class SequentialIdGenerator implements IdGenerator {
  private nextId = 1;

  generate(): string {
    return `attempt-${this.nextId++}`;
  }
}

describe('StartGoogleLoginUseCase', () => {
  function buildUseCase(
    repository: InMemoryLoginAttemptRepository,
    googleIdentity: FakeGoogleIdentity,
  ): StartGoogleLoginUseCase {
    return new StartGoogleLoginUseCase(
      googleIdentity,
      repository,
      new FakeTokenGenerator(),
      new SequentialIdGenerator(),
      new FixedClock(new Date('2026-01-01T00:00:00.000Z')),
    );
  }

  it('persists a login attempt with hashed state and transaction, and the raw code verifier', async () => {
    const repository = new InMemoryLoginAttemptRepository();
    const googleIdentity = new FakeGoogleIdentity();
    const useCase = buildUseCase(repository, googleIdentity);

    const result = await useCase.execute({ redirectTo: '/workspace' });

    expect(repository.saved).toHaveLength(1);
    const primitives = repository.saved[0].toPrimitives();
    expect(primitives.redirectTo).toBe('/workspace');
    expect(primitives.codeVerifier).toBe('verifier');
    expect(primitives.stateHash).not.toBe('token-1');
    expect(result.transactionToken).toBeDefined();
  });

  it('falls back to /dashboard when redirectTo does not start with a single slash', async () => {
    const repository = new InMemoryLoginAttemptRepository();
    const googleIdentity = new FakeGoogleIdentity();
    const useCase = buildUseCase(repository, googleIdentity);

    await useCase.execute({ redirectTo: '//evil.example' });

    expect(repository.saved[0].getRedirectTo()).toBe('/dashboard');
  });

  it('falls back to /dashboard when redirectTo is an absolute URL', async () => {
    const repository = new InMemoryLoginAttemptRepository();
    const googleIdentity = new FakeGoogleIdentity();
    const useCase = buildUseCase(repository, googleIdentity);

    await useCase.execute({ redirectTo: 'https://evil.example' });

    expect(repository.saved[0].getRedirectTo()).toBe('/dashboard');
  });

  it('builds the authorization url with the nonce and the code challenge', async () => {
    const repository = new InMemoryLoginAttemptRepository();
    const googleIdentity = new FakeGoogleIdentity();
    const useCase = buildUseCase(repository, googleIdentity);

    const result = await useCase.execute({});

    expect(result.authorizationUrl).toContain('nonce=');
    expect(result.authorizationUrl).toContain('code_challenge=challenge');
    expect(googleIdentity.receivedParams?.nonce).toBe(repository.saved[0].getNonce());
  });
});
