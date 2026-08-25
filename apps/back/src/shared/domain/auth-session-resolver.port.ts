export const AUTH_SESSION_RESOLVER = Symbol('AuthSessionResolver');

export interface ResolvedAuthSession {
  user: {
    email: string;
  };
  session: {
    createdAt: Date;
    token: string;
  };
}

export interface AuthSessionResolution {
  session: ResolvedAuthSession | null;
  setCookies: string[];
}

export interface AuthSessionResolver {
  resolve(headers: Headers): Promise<AuthSessionResolution>;
}
