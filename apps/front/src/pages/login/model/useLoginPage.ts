import { useEffect, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/httpClient';
import { bootstrapFirstAdmin, sessionQueries, startGoogleLogin } from '@/entities/session';

export type LoginStatus = 'loading' | 'bootstrap' | 'signIn';
export type LoginAuthError = 'accessDenied' | 'expired' | 'failed';
export type BootstrapErrorCode = 'notAllowed' | 'failed';
export type SessionNotice = 'expired' | 'signedOut';

const AUTH_ERROR_CODES: Record<string, LoginAuthError> = {
  access_denied: 'accessDenied',
  expired: 'expired',
  failed: 'failed',
};

interface LoginPageSearch {
  authError?: unknown;
  sessionExpired?: unknown;
  signedOut?: unknown;
}

export interface UseLoginPageResult {
  status: LoginStatus;
  authError: LoginAuthError | undefined;
  sessionNotice: SessionNotice | undefined;
  bootstrapEmail: string;
  setBootstrapEmail: (value: string) => void;
  bootstrapSubmitting: boolean;
  bootstrapError: BootstrapErrorCode | undefined;
  handleBootstrapSubmit: () => Promise<void>;
  signInSubmitting: boolean;
  handleSignIn: () => Promise<void>;
}

export function useLoginPage(): UseLoginPageResult {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as LoginPageSearch;
  const { data, isLoading } = useQuery(sessionQueries.status());

  const [bootstrapEmail, setBootstrapEmail] = useState('');
  const [bootstrapSubmitting, setBootstrapSubmitting] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<BootstrapErrorCode | undefined>(undefined);
  const [signInSubmitting, setSignInSubmitting] = useState(false);

  const rawAuthError = typeof search.authError === 'string' ? search.authError : undefined;
  const authError = rawAuthError ? AUTH_ERROR_CODES[rawAuthError] : undefined;
  const sessionNotice: SessionNotice | undefined =
    search.sessionExpired === true ? 'expired' : search.signedOut === true ? 'signedOut' : undefined;

  const authenticated = !isLoading && data?.authenticated === true;

  useEffect(() => {
    if (authenticated) {
      void navigate({ to: '/dashboard' });
    }
  }, [authenticated, navigate]);

  const handleBootstrapSubmit = async () => {
    setBootstrapSubmitting(true);
    try {
      await bootstrapFirstAdmin(bootstrapEmail);
      const { authorizationUrl } = await startGoogleLogin(undefined, bootstrapEmail);
      window.location.assign(authorizationUrl);
    } catch (error) {
      setBootstrapError(error instanceof ApiError && error.status === 403 ? 'notAllowed' : 'failed');
      setBootstrapSubmitting(false);
    }
  };

  const handleSignIn = async () => {
    setSignInSubmitting(true);
    try {
      const { authorizationUrl } = await startGoogleLogin();
      window.location.assign(authorizationUrl);
    } catch {
      setSignInSubmitting(false);
    }
  };

  const status: LoginStatus =
    isLoading || authenticated ? 'loading' : data?.bootstrapNeeded ? 'bootstrap' : 'signIn';

  return {
    status,
    authError,
    sessionNotice,
    bootstrapEmail,
    setBootstrapEmail,
    bootstrapSubmitting,
    bootstrapError,
    handleBootstrapSubmit,
    signInSubmitting,
    handleSignIn,
  };
}
