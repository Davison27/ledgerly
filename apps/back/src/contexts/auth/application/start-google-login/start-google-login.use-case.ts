import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import { GOOGLE_IDENTITY, GoogleIdentity } from '../../domain/google-identity.port';
import { LoginAttempt } from '../../domain/login-attempt';
import { LOGIN_ATTEMPT_REPOSITORY, LoginAttemptRepository } from '../../domain/login-attempt.repository';
import { TOKEN_GENERATOR, TokenGenerator } from '../../domain/token-generator.port';
import { StartGoogleLoginCommand } from './start-google-login.command';
import { StartGoogleLoginResult } from './start-google-login.result';

const DEFAULT_REDIRECT_TO = '/dashboard';
const OAUTH_ATTEMPT_TTL_MINUTES = 10;

function sanitizeRedirectTo(redirectTo: string | undefined): string {
  if (redirectTo === undefined) {
    return DEFAULT_REDIRECT_TO;
  }

  if (!redirectTo.startsWith('/') || redirectTo.startsWith('//')) {
    return DEFAULT_REDIRECT_TO;
  }

  return redirectTo;
}

@Injectable()
export class StartGoogleLoginUseCase {
  constructor(
    @Inject(GOOGLE_IDENTITY) private readonly googleIdentity: GoogleIdentity,
    @Inject(LOGIN_ATTEMPT_REPOSITORY) private readonly loginAttemptRepository: LoginAttemptRepository,
    @Inject(TOKEN_GENERATOR) private readonly tokenGenerator: TokenGenerator,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: StartGoogleLoginCommand): Promise<StartGoogleLoginResult> {
    const redirectTo = sanitizeRedirectTo(command.redirectTo);
    const { codeVerifier, codeChallenge } = await this.googleIdentity.generatePkcePair();
    const state = this.tokenGenerator.generateOpaqueToken();
    const nonce = this.tokenGenerator.generateOpaqueToken();
    const transactionToken = this.tokenGenerator.generateOpaqueToken();

    const attempt = LoginAttempt.create({
      id: this.idGenerator.generate(),
      transactionHash: this.tokenGenerator.hash(transactionToken),
      stateHash: this.tokenGenerator.hash(state),
      codeVerifier,
      nonce,
      redirectTo,
      now: this.clock.now(),
      ttlMinutes: OAUTH_ATTEMPT_TTL_MINUTES,
    });

    await this.loginAttemptRepository.save(attempt);

    const authorizationUrl = this.googleIdentity.buildAuthorizationUrl({
      state,
      codeChallenge,
      nonce,
      loginHint: command.loginHint,
    });

    return { authorizationUrl, transactionToken };
  }
}
