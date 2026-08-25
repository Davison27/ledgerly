import { get, post, setSigningOut } from '@/shared/api/httpClient';
import { authClient } from '@/shared/api/auth-client';
import {
  clearSessionLifecycleState,
  readSessionLifecycleState,
  writeSessionLifecycleState,
} from '../model/sessionLifecycle';
import type { AuthStatusDto, BootstrapFirstAdminResultDto } from './types';

export function getAuthStatus(): Promise<AuthStatusDto> {
  return get<AuthStatusDto>('/auth/status');
}

export function bootstrapFirstAdmin(email: string): Promise<BootstrapFirstAdminResultDto> {
  return post<BootstrapFirstAdminResultDto>('/auth/bootstrap', { email });
}

export async function signInWithGoogle(callbackURL: string): Promise<void> {
  const previousState = readSessionLifecycleState();
  clearSessionLifecycleState();

  try {
    const { error } = await authClient.signIn.social({ provider: 'google', callbackURL });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    if (previousState.locked) {
      writeSessionLifecycleState(previousState);
    }
    throw error;
  }
}

export async function logout(): Promise<void> {
  setSigningOut(true);
  try {
    const { error } = await authClient.signOut();

    if (error) {
      throw new Error(error.message);
    }
  } finally {
    setSigningOut(false);
  }
}
