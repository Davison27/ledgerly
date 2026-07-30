import { get, post } from '@/shared/api/httpClient';
import { authClient } from '@/shared/api/auth-client';
import type { AuthStatusDto, BootstrapFirstAdminResultDto } from './types';

export function getAuthStatus(): Promise<AuthStatusDto> {
  return get<AuthStatusDto>('/auth/status');
}

export function bootstrapFirstAdmin(email: string): Promise<BootstrapFirstAdminResultDto> {
  return post<BootstrapFirstAdminResultDto>('/auth/bootstrap', { email });
}

export async function signInWithGoogle(callbackURL: string): Promise<void> {
  const { error } = await authClient.signIn.social({ provider: 'google', callbackURL });

  if (error) {
    throw new Error(error.message);
  }
}

export async function logout(): Promise<void> {
  const { error } = await authClient.signOut();

  if (error) {
    throw new Error(error.message);
  }
}
