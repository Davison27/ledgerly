import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import { GOOGLE_IDENTITY, GoogleIdentity, GoogleIdentityResult } from '../../domain/google-identity.port';
import { GoogleIdentityRejectedException } from '../../domain/errors/google-identity-rejected.exception';
import { OAuthAttemptExpiredException } from '../../domain/errors/oauth-attempt-expired.exception';
import { OAuthLoginFailedException } from '../../domain/errors/oauth-login-failed.exception';
import { LoginAttempt } from '../../domain/login-attempt';
import { LOGIN_ATTEMPT_REPOSITORY, LoginAttemptRepository } from '../../domain/login-attempt.repository';
import { Session } from '../../domain/session';
import { SESSION_REPOSITORY, SessionRepository } from '../../domain/session.repository';
import { TOKEN_GENERATOR, TokenGenerator } from '../../domain/token-generator.port';
import { WorkspaceMember } from '../../domain/workspace-member';
import { WORKSPACE_MEMBER_REPOSITORY, WorkspaceMemberRepository } from '../../domain/workspace-member.repository';
import { CompleteGoogleLoginCommand } from './complete-google-login.command';
import { CompleteGoogleLoginResult } from './complete-google-login.result';

@Injectable()
export class CompleteGoogleLoginUseCase {
  constructor(
    @Inject(LOGIN_ATTEMPT_REPOSITORY) private readonly loginAttemptRepository: LoginAttemptRepository,
    @Inject(WORKSPACE_MEMBER_REPOSITORY) private readonly workspaceMemberRepository: WorkspaceMemberRepository,
    @Inject(SESSION_REPOSITORY) private readonly sessionRepository: SessionRepository,
    @Inject(GOOGLE_IDENTITY) private readonly googleIdentity: GoogleIdentity,
    @Inject(TOKEN_GENERATOR) private readonly tokenGenerator: TokenGenerator,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: CompleteGoogleLoginCommand): Promise<CompleteGoogleLoginResult> {
    const now = this.clock.now();

    const attempt = await this.consumeAttempt(command.transactionToken, now);
    this.checkState(attempt, command.state);

    const identity = await this.exchangeCode(command.code, attempt.getCodeVerifier());
    this.checkIdentity(identity, attempt.getNonce());

    const member = await this.resolveMember(identity.email);
    await this.checkSubjectOwnership(identity.subject, member);

    member.bindGoogleAccount(identity.subject, identity.name, now);
    await this.workspaceMemberRepository.save(member);

    await this.revokePreviousSession(command.existingSessionToken, now);

    return this.issueSession(member, attempt.getRedirectTo(), now);
  }

  private async consumeAttempt(transactionToken: string, now: Date): Promise<LoginAttempt> {
    const attempt = await this.loginAttemptRepository.consumeByTransactionHash(
      this.tokenGenerator.hash(transactionToken),
      now,
    );

    if (attempt === null) {
      throw new OAuthLoginFailedException('login attempt not found or already used');
    }

    if (attempt.isExpired(now)) {
      throw new OAuthAttemptExpiredException();
    }

    return attempt;
  }

  private checkState(attempt: LoginAttempt, state: string): void {
    if (!attempt.matchesState(this.tokenGenerator.hash(state))) {
      throw new OAuthLoginFailedException('state does not match the login attempt');
    }
  }

  private async exchangeCode(code: string, codeVerifier: string): Promise<GoogleIdentityResult> {
    try {
      return await this.googleIdentity.exchangeCode(code, codeVerifier);
    } catch {
      throw new OAuthLoginFailedException('failed to exchange the authorization code');
    }
  }

  private checkIdentity(identity: GoogleIdentityResult, expectedNonce: string): void {
    if (!identity.subject || !identity.email) {
      throw new OAuthLoginFailedException('incomplete identity from google');
    }

    if (identity.nonce !== expectedNonce) {
      throw new OAuthLoginFailedException('nonce does not match the login attempt');
    }

    if (!identity.emailVerified) {
      throw new GoogleIdentityRejectedException('email is not verified');
    }
  }

  private async resolveMember(email: string): Promise<WorkspaceMember> {
    const member = await this.workspaceMemberRepository.findByEmail(email.trim().toLowerCase());

    if (member === null || member.isDisabled()) {
      throw new GoogleIdentityRejectedException('access denied');
    }

    return member;
  }

  private async checkSubjectOwnership(subject: string, member: WorkspaceMember): Promise<void> {
    const owner = await this.workspaceMemberRepository.findByGoogleSubject(subject);

    if (owner !== null && owner.getId() !== member.getId()) {
      throw new GoogleIdentityRejectedException('google subject already bound to another member');
    }
  }

  private async revokePreviousSession(existingSessionToken: string | null, now: Date): Promise<void> {
    if (existingSessionToken === null) {
      return;
    }

    const found = await this.sessionRepository.findActiveByTokenHash(
      this.tokenGenerator.hash(existingSessionToken),
      now,
    );

    if (found !== null) {
      await this.sessionRepository.revokeById(found.session.getId(), now);
    }
  }

  private async issueSession(
    member: WorkspaceMember,
    redirectTo: string,
    now: Date,
  ): Promise<CompleteGoogleLoginResult> {
    const sessionToken = this.tokenGenerator.generateOpaqueToken();
    const csrfToken = this.tokenGenerator.generateOpaqueToken();

    const session = Session.create({
      id: this.idGenerator.generate(),
      memberId: member.getId(),
      tokenHash: this.tokenGenerator.hash(sessionToken),
      csrfHash: this.tokenGenerator.hash(csrfToken),
      now,
    });

    await this.sessionRepository.save(session);

    return { sessionToken, csrfToken, redirectTo };
  }
}
