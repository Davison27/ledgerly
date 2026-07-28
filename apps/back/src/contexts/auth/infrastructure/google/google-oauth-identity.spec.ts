import { ConfigService } from '@nestjs/config';
import { GoogleOAuthIdentity } from './google-oauth-identity';

function fakeConfigService(values: Record<string, string>): ConfigService {
  return {
    get: (key: string, fallback?: string) => values[key] ?? fallback,
  } as unknown as ConfigService;
}

describe('GoogleOAuthIdentity', () => {
  it('builds an authorization url carrying the nonce and the PKCE challenge method', () => {
    const identity = new GoogleOAuthIdentity(
      fakeConfigService({
        GOOGLE_CLIENT_ID: 'client-id.apps.googleusercontent.com',
        GOOGLE_CLIENT_SECRET: 'client-secret',
        BACKEND_PUBLIC_URL: 'http://localhost:3005',
      }),
    );

    const url = identity.buildAuthorizationUrl({
      state: 'state-value',
      codeChallenge: 'challenge-value',
      nonce: 'nonce-value',
    });

    const parsed = new URL(url);

    expect(parsed.searchParams.get('nonce')).toBe('nonce-value');
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
    expect(parsed.searchParams.get('code_challenge')).toBe('challenge-value');
    expect(parsed.searchParams.get('state')).toBe('state-value');
    expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:3005/api/auth/google/callback');
    expect(url).toContain('nonce=');
  });

  it('omits login_hint when none is given', () => {
    const identity = new GoogleOAuthIdentity(
      fakeConfigService({
        GOOGLE_CLIENT_ID: 'client-id.apps.googleusercontent.com',
        GOOGLE_CLIENT_SECRET: 'client-secret',
        BACKEND_PUBLIC_URL: 'http://localhost:3005',
      }),
    );

    const url = identity.buildAuthorizationUrl({
      state: 'state-value',
      codeChallenge: 'challenge-value',
      nonce: 'nonce-value',
    });

    expect(new URL(url).searchParams.has('login_hint')).toBe(false);
  });

  it('includes login_hint when provided', () => {
    const identity = new GoogleOAuthIdentity(
      fakeConfigService({
        GOOGLE_CLIENT_ID: 'client-id.apps.googleusercontent.com',
        GOOGLE_CLIENT_SECRET: 'client-secret',
        BACKEND_PUBLIC_URL: 'http://localhost:3005',
      }),
    );

    const url = identity.buildAuthorizationUrl({
      state: 'state-value',
      codeChallenge: 'challenge-value',
      nonce: 'nonce-value',
      loginHint: 'person@ledgerly.dev',
    });

    expect(new URL(url).searchParams.get('login_hint')).toBe('person@ledgerly.dev');
  });
});
