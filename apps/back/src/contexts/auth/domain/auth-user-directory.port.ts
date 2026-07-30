export const AUTH_USER_DIRECTORY = Symbol('AuthUserDirectory');

export interface AuthUserIdentity {
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  providers: string[];
  activeSessions: number;
  lastSessionAt: Date | null;
}

export interface AuthUserDirectory {
  findByEmails(emails: string[]): Promise<Map<string, AuthUserIdentity>>;
}
