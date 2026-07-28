import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CodeChallengeMethod, GenerateAuthUrlOpts, OAuth2Client } from 'google-auth-library';
import {
  GoogleAuthorizationUrlParams,
  GoogleIdentity,
  GoogleIdentityResult,
  GooglePkcePair,
} from '../../domain/google-identity.port';

export const GOOGLE_LOGIN_SCOPES = ['openid', 'email', 'profile'];

@Injectable()
export class GoogleOAuthIdentity implements GoogleIdentity {
  private readonly client: OAuth2Client;

  constructor(private readonly configService: ConfigService) {
    this.client = new OAuth2Client({
      clientId: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      redirectUri: this.buildRedirectUri(),
    });
  }

  async generatePkcePair(): Promise<GooglePkcePair> {
    const { codeVerifier, codeChallenge } = await this.client.generateCodeVerifierAsync();

    if (!codeChallenge) {
      throw new Error('google-auth-library did not return a code challenge');
    }

    return { codeVerifier, codeChallenge };
  }

  buildAuthorizationUrl(params: GoogleAuthorizationUrlParams): string {
    const base: GenerateAuthUrlOpts = {
      access_type: 'online',
      response_type: 'code',
      scope: GOOGLE_LOGIN_SCOPES,
      include_granted_scopes: true,
      state: params.state,
      code_challenge_method: CodeChallengeMethod.S256,
      code_challenge: params.codeChallenge,
      ...(params.loginHint !== undefined ? { login_hint: params.loginHint } : {}),
    };

    const opts = { ...base, nonce: params.nonce } as GenerateAuthUrlOpts & { nonce: string };

    return this.client.generateAuthUrl(opts);
  }

  async exchangeCode(code: string, verifier: string): Promise<GoogleIdentityResult> {
    const { tokens } = await this.client.getToken({ code, codeVerifier: verifier });

    if (!tokens.id_token) {
      throw new Error('google token exchange did not return an id_token');
    }

    const ticket = await this.client.verifyIdToken({
      idToken: tokens.id_token,
      audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new Error('google id_token has no payload');
    }

    return {
      subject: payload.sub,
      email: payload.email ?? '',
      emailVerified: payload.email_verified === true,
      name: payload.name ?? '',
      nonce: payload.nonce ?? null,
    };
  }

  private buildRedirectUri(): string {
    const backendPublicUrl = this.configService.get<string>('BACKEND_PUBLIC_URL', 'http://localhost:3005');

    return `${backendPublicUrl}/api/auth/google/callback`;
  }
}
