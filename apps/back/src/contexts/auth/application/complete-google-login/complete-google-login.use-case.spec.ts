import { CompleteGoogleLoginUseCase } from './complete-google-login.use-case';
import { GoogleIdentityRejectedException } from '../../domain/errors/google-identity-rejected.exception';
import { OAuthLoginFailedException } from '../../domain/errors/oauth-login-failed.exception';
import {
  GoogleAuthorizationUrlParams,
  GoogleIdentity,
  GoogleIdentityResult,
  GooglePkcePair,
} from '../../domain/google-identity.port';
import { LoginAttempt } from '../../domain/login-attempt';
import { LoginAttemptRepository } from '../../domain/login-attempt.repository';
import { Session } from '../../domain/session';
import { SessionRepository, SessionWithMember } from '../../domain/session.repository';
import { TokenGenerator } from '../../domain/token-generator.port';
import { WorkspaceMember } from '../../domain/workspace-member';
import { WorkspaceMemberRepository } from '../../domain/workspace-member.repository';
import { MemberEmail } from '../../domain/value-objects/member-email';
import { PermissionMatrix, WORKSPACE_MODULES } from '../../domain/value-objects/permission-matrix';
import { Clock } from '../../../../shared/domain/clock.port';
import { IdGenerator } from '../../../../shared/domain/id-generator.port';

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
    return `id-${this.nextId++}`;
  }
}

class InMemoryLoginAttemptRepository implements LoginAttemptRepository {
  constructor(private attempt: LoginAttempt | null) {}

  save(): Promise<void> {
    return Promise.resolve();
  }

  consumeByTransactionHash(transactionHash: string): Promise<LoginAttempt | null> {
    if (this.attempt === null) {
      return Promise.resolve(null);
    }

    const primitives = this.attempt.toPrimitives();

    if (primitives.transactionHash !== transactionHash || primitives.consumedAt !== null) {
      return Promise.resolve(null);
    }

    const consumed = LoginAttempt.fromPrimitives({ ...primitives, consumedAt: new Date() });
    this.attempt = consumed;

    return Promise.resolve(consumed);
  }

  deleteExpired(): Promise<number> {
    return Promise.resolve(0);
  }
}

class InMemoryWorkspaceMemberRepository implements WorkspaceMemberRepository {
  saved: WorkspaceMember[] = [];

  constructor(private members: WorkspaceMember[]) {}

  findAll(): Promise<WorkspaceMember[]> {
    return Promise.resolve(this.members);
  }

  findById(id: string): Promise<WorkspaceMember | null> {
    return Promise.resolve(this.members.find((member) => member.getId() === id) ?? null);
  }

  findByEmail(email: string): Promise<WorkspaceMember | null> {
    return Promise.resolve(this.members.find((member) => member.getEmail() === email) ?? null);
  }

  findByGoogleSubject(subject: string): Promise<WorkspaceMember | null> {
    return Promise.resolve(this.members.find((member) => member.getGoogleSubject() === subject) ?? null);
  }

  countAll(): Promise<number> {
    return Promise.resolve(this.members.length);
  }

  countActiveAdmins(): Promise<number> {
    return Promise.resolve(this.members.filter((member) => member.isAdmin() && member.isActive()).length);
  }

  save(member: WorkspaceMember): Promise<void> {
    this.saved.push(member);
    this.members = this.members.map((existing) => (existing.getId() === member.getId() ? member : existing));
    return Promise.resolve();
  }

  insertFounder(): Promise<void> {
    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }

  touchLastActive(): Promise<void> {
    return Promise.resolve();
  }
}

class InMemorySessionRepository implements SessionRepository {
  saved: Session[] = [];
  revokedIds: string[] = [];

  findActiveByTokenHash(): Promise<SessionWithMember | null> {
    return Promise.resolve(null);
  }

  save(session: Session): Promise<void> {
    this.saved.push(session);
    return Promise.resolve();
  }

  revokeById(id: string): Promise<void> {
    this.revokedIds.push(id);
    return Promise.resolve();
  }

  revokeAllForMember(): Promise<void> {
    return Promise.resolve();
  }

  deleteExpired(): Promise<number> {
    return Promise.resolve(0);
  }
}

class FakeGoogleIdentity implements GoogleIdentity {
  constructor(private readonly result: GoogleIdentityResult) {}

  generatePkcePair(): Promise<GooglePkcePair> {
    return Promise.resolve({ codeVerifier: 'verifier', codeChallenge: 'challenge' });
  }

  buildAuthorizationUrl(params: GoogleAuthorizationUrlParams): string {
    return `https://accounts.google.com?state=${params.state}`;
  }

  exchangeCode(): Promise<GoogleIdentityResult> {
    return Promise.resolve(this.result);
  }
}

const NOW = new Date('2026-01-10T00:00:00.000Z');

function viewerMatrix(): PermissionMatrix {
  return PermissionMatrix.create(
    WORKSPACE_MODULES.reduce<Record<string, string>>((matrix, module) => {
      matrix[module] = 'view';
      return matrix;
    }, {}),
  );
}

function invitedMember(overrides: { status?: 'invited' | 'active' | 'disabled'; googleSubject?: string | null } = {}) {
  return WorkspaceMember.create({
    id: 'member-1',
    email: MemberEmail.create('person@ledgerly.dev'),
    name: 'Provisional',
    permissions: viewerMatrix(),
    status: overrides.status ?? 'invited',
    googleSubject: overrides.googleSubject ?? null,
    invitedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

function validAttempt(): LoginAttempt {
  return LoginAttempt.create({
    id: 'attempt-1',
    transactionHash: 'hash(transaction-token)',
    stateHash: 'hash(state-value)',
    codeVerifier: 'verifier',
    nonce: 'expected-nonce',
    redirectTo: '/dashboard',
    now: NOW,
    ttlMinutes: 10,
  });
}

function buildUseCase(deps: {
  loginAttemptRepository: InMemoryLoginAttemptRepository;
  workspaceMemberRepository: InMemoryWorkspaceMemberRepository;
  sessionRepository: InMemorySessionRepository;
  googleIdentity: FakeGoogleIdentity;
}): CompleteGoogleLoginUseCase {
  return new CompleteGoogleLoginUseCase(
    deps.loginAttemptRepository,
    deps.workspaceMemberRepository,
    deps.sessionRepository,
    deps.googleIdentity,
    new FakeTokenGenerator(),
    new SequentialIdGenerator(),
    new FixedClock(NOW),
  );
}

const HAPPY_IDENTITY: GoogleIdentityResult = {
  subject: 'google-subject-1',
  email: 'person@ledgerly.dev',
  emailVerified: true,
  name: 'Real Name',
  nonce: 'expected-nonce',
};

const COMMAND = {
  transactionToken: 'transaction-token',
  code: 'auth-code',
  state: 'state-value',
  existingSessionToken: null,
};

describe('CompleteGoogleLoginUseCase', () => {
  it('activates an invited member and issues a session on the happy path', async () => {
    const workspaceMemberRepository = new InMemoryWorkspaceMemberRepository([invitedMember()]);
    const sessionRepository = new InMemorySessionRepository();
    const useCase = buildUseCase({
      loginAttemptRepository: new InMemoryLoginAttemptRepository(validAttempt()),
      workspaceMemberRepository,
      sessionRepository,
      googleIdentity: new FakeGoogleIdentity(HAPPY_IDENTITY),
    });

    const result = await useCase.execute(COMMAND);

    expect(result.sessionToken).toBeDefined();
    expect(result.csrfToken).toBeDefined();
    expect(result.redirectTo).toBe('/dashboard');
    expect(sessionRepository.saved).toHaveLength(1);
    expect(workspaceMemberRepository.saved[0].getStatus()).toBe('active');
    expect(workspaceMemberRepository.saved[0].getGoogleSubject()).toBe('google-subject-1');
  });

  it('rejects when the member does not exist', async () => {
    const workspaceMemberRepository = new InMemoryWorkspaceMemberRepository([]);
    const sessionRepository = new InMemorySessionRepository();
    const useCase = buildUseCase({
      loginAttemptRepository: new InMemoryLoginAttemptRepository(validAttempt()),
      workspaceMemberRepository,
      sessionRepository,
      googleIdentity: new FakeGoogleIdentity(HAPPY_IDENTITY),
    });

    await expect(useCase.execute(COMMAND)).rejects.toThrow(GoogleIdentityRejectedException);
    expect(sessionRepository.saved).toHaveLength(0);
  });

  it('rejects a disabled member, leaves it disabled and creates no session', async () => {
    const workspaceMemberRepository = new InMemoryWorkspaceMemberRepository([
      invitedMember({ status: 'disabled', googleSubject: 'google-subject-1' }),
    ]);
    const sessionRepository = new InMemorySessionRepository();
    const useCase = buildUseCase({
      loginAttemptRepository: new InMemoryLoginAttemptRepository(validAttempt()),
      workspaceMemberRepository,
      sessionRepository,
      googleIdentity: new FakeGoogleIdentity(HAPPY_IDENTITY),
    });

    await expect(useCase.execute(COMMAND)).rejects.toThrow(GoogleIdentityRejectedException);
    expect(sessionRepository.saved).toHaveLength(0);
    expect(workspaceMemberRepository.saved).toHaveLength(0);

    const stillDisabled = await workspaceMemberRepository.findByEmail('person@ledgerly.dev');
    expect(stillDisabled?.getStatus()).toBe('disabled');
  });

  it('rejects when the email is not verified', async () => {
    const workspaceMemberRepository = new InMemoryWorkspaceMemberRepository([invitedMember()]);
    const sessionRepository = new InMemorySessionRepository();
    const useCase = buildUseCase({
      loginAttemptRepository: new InMemoryLoginAttemptRepository(validAttempt()),
      workspaceMemberRepository,
      sessionRepository,
      googleIdentity: new FakeGoogleIdentity({ ...HAPPY_IDENTITY, emailVerified: false }),
    });

    await expect(useCase.execute(COMMAND)).rejects.toThrow(GoogleIdentityRejectedException);
    expect(sessionRepository.saved).toHaveLength(0);
  });

  it('rejects when the nonce does not match the login attempt', async () => {
    const workspaceMemberRepository = new InMemoryWorkspaceMemberRepository([invitedMember()]);
    const sessionRepository = new InMemorySessionRepository();
    const useCase = buildUseCase({
      loginAttemptRepository: new InMemoryLoginAttemptRepository(validAttempt()),
      workspaceMemberRepository,
      sessionRepository,
      googleIdentity: new FakeGoogleIdentity({ ...HAPPY_IDENTITY, nonce: 'unexpected-nonce' }),
    });

    await expect(useCase.execute(COMMAND)).rejects.toThrow(OAuthLoginFailedException);
    expect(sessionRepository.saved).toHaveLength(0);
  });

  it('rejects when the google subject already belongs to another member', async () => {
    const otherMember = invitedMember({ status: 'active', googleSubject: 'google-subject-1' });
    const targetMember = WorkspaceMember.create({
      id: 'member-2',
      email: MemberEmail.create('other@ledgerly.dev'),
      name: 'Other',
      permissions: viewerMatrix(),
      status: 'invited',
      invitedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const workspaceMemberRepository = new InMemoryWorkspaceMemberRepository([otherMember, targetMember]);
    const sessionRepository = new InMemorySessionRepository();
    const useCase = buildUseCase({
      loginAttemptRepository: new InMemoryLoginAttemptRepository(validAttempt()),
      workspaceMemberRepository,
      sessionRepository,
      googleIdentity: new FakeGoogleIdentity({ ...HAPPY_IDENTITY, email: 'other@ledgerly.dev' }),
    });

    await expect(useCase.execute(COMMAND)).rejects.toThrow(GoogleIdentityRejectedException);
    expect(sessionRepository.saved).toHaveLength(0);
  });

  it('revokes the previous session when the request carried one', async () => {
    const workspaceMemberRepository = new InMemoryWorkspaceMemberRepository([invitedMember()]);
    const sessionRepository = new InMemorySessionRepository();
    const existingSession = Session.create({
      id: 'session-old',
      memberId: 'member-1',
      tokenHash: 'hash(old-session-token)',
      csrfHash: 'hash(old-csrf)',
      now: NOW,
    });
    sessionRepository.findActiveByTokenHash = () =>
      Promise.resolve({ session: existingSession, member: invitedMember() });

    const useCase = buildUseCase({
      loginAttemptRepository: new InMemoryLoginAttemptRepository(validAttempt()),
      workspaceMemberRepository,
      sessionRepository,
      googleIdentity: new FakeGoogleIdentity(HAPPY_IDENTITY),
    });

    await useCase.execute({ ...COMMAND, existingSessionToken: 'old-session-token' });

    expect(sessionRepository.revokedIds).toEqual(['session-old']);
  });
});
