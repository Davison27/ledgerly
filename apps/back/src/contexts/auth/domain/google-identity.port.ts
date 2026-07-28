export const GOOGLE_IDENTITY = Symbol('GoogleIdentity');

export interface GoogleAuthorizationUrlParams {
  state: string;
  codeChallenge: string;
  nonce: string;
  loginHint?: string;
}

export interface GoogleIdentityResult {
  subject: string;
  email: string;
  emailVerified: boolean;
  name: string;
  nonce: string | null;
}

export interface GooglePkcePair {
  codeVerifier: string;
  codeChallenge: string;
}

export interface GoogleIdentity {
  generatePkcePair(): Promise<GooglePkcePair>;
  buildAuthorizationUrl(params: GoogleAuthorizationUrlParams): string;
  exchangeCode(code: string, verifier: string): Promise<GoogleIdentityResult>;
}
