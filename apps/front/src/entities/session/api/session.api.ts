import { get, post } from '@/shared/api/httpClient';
import type { AuthStatusDto, BootstrapFirstAdminResultDto, StartGoogleLoginResultDto } from './types';

export function getAuthStatus(): Promise<AuthStatusDto> {
  return get<AuthStatusDto>('/auth/status');
}

export function bootstrapFirstAdmin(email: string): Promise<BootstrapFirstAdminResultDto> {
  return post<BootstrapFirstAdminResultDto>('/auth/bootstrap', { email });
}

export function startGoogleLogin(
  redirectTo?: string,
  loginHint?: string,
): Promise<StartGoogleLoginResultDto> {
  return post<StartGoogleLoginResultDto>('/auth/google/start', { redirectTo, loginHint });
}

export function logout(): Promise<void> {
  return post<void>('/auth/logout');
}
