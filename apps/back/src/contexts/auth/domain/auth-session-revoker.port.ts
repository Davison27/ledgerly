export const AUTH_SESSION_REVOKER = Symbol('AuthSessionRevoker');

export interface AuthSessionRevoker {
  revokeAllForEmail(email: string): Promise<void>;
}
