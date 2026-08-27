import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  createActiveSessionLifecycleState,
  isLockedSessionLifecycleValue,
  isSessionIdle,
  isSessionLifecycleLocked,
  lockSessionLifecycle,
  logout,
  readSessionLifecycleState,
  sessionQueries,
  shouldPersistSessionActivity,
  writeSessionLifecycleState,
  SESSION_INACTIVITY_TIMEOUT_MS,
  SESSION_LIFECYCLE_LOCK_EVENT,
  SESSION_LIFECYCLE_STORAGE_KEY,
} from '@/entities/session';
import { workspaceMemberQueries } from '@/entities/workspace-member';
import { ApiError } from '@/shared/api/httpClient';

const SESSION_REVALIDATION_INTERVAL_MS = 60 * 1000;

type GuardState = 'checking' | 'locked' | 'ready';
type LoginRedirectSearch =
  | { sessionExpired: true }
  | { authError: 'access_denied' };

export function useSessionGuard(): boolean {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [initialState] = useState(() => readSessionLifecycleState());
  const [guardState, setGuardState] = useState<GuardState>(
    initialState.locked ? 'locked' : 'checking',
  );
  const guardStateRef = useRef<GuardState>(guardState);
  const lastActivityAtRef = useRef(initialState.lastActivityAt);
  const persistedActivityAtRef = useRef(initialState.lastActivityAt);
  const idleTimerRef = useRef<number | undefined>(undefined);
  const mountedRef = useRef(false);
  const redirectingRef = useRef(false);
  const validationInFlightRef = useRef(false);
  const validationIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    const updateGuardState = (nextState: GuardState) => {
      guardStateRef.current = nextState;
      setGuardState(nextState);
    };

    const lockChildren = () => {
      if (guardStateRef.current !== 'locked') {
        flushSync(() => updateGuardState('locked'));
      }
    };

    const clearIdleTimer = () => {
      if (idleTimerRef.current !== undefined) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = undefined;
      }
    };

    const lockAndRedirect = (
      search: LoginRedirectSearch,
      shouldSignOut: boolean,
      persistLock = true,
    ) => {
      if (redirectingRef.current) return;

      redirectingRef.current = true;
      validationIdRef.current += 1;
      clearIdleTimer();
      lockChildren();
      queryClient.clear();
      if (persistLock) {
        lockSessionLifecycle();
      }

      void (async () => {
        if (shouldSignOut) {
          try {
            await logout();
          } catch {
            if (mountedRef.current) {
              void navigate({ to: '/', search });
            }
            return;
          }
        }

        if (mountedRef.current) {
          void navigate({ to: '/', search });
        }
      })();
    };

    const failClosedValidation = () => {
      if (redirectingRef.current || guardStateRef.current === 'locked') return;

      if (guardStateRef.current === 'ready') {
        flushSync(() => updateGuardState('checking'));
      }

      queryClient.clear();
    };

    const scheduleIdleCheck = () => {
      clearIdleTimer();
      if (guardStateRef.current !== 'ready' || redirectingRef.current) return;

      const lastActivityAt = lastActivityAtRef.current;
      if (lastActivityAt === null) return;

      const delay = Math.max(0, lastActivityAt + SESSION_INACTIVITY_TIMEOUT_MS - Date.now());
      idleTimerRef.current = window.setTimeout(() => {
        if (isSessionIdle(lastActivityAtRef.current, Date.now())) {
          lockAndRedirect({ sessionExpired: true }, true);
          return;
        }

        scheduleIdleCheck();
      }, delay);
    };

    const validateSession = async () => {
      if (
        !mountedRef.current ||
        redirectingRef.current ||
        validationInFlightRef.current ||
        guardStateRef.current === 'locked'
      ) {
        return;
      }

      validationInFlightRef.current = true;
      const validationId = ++validationIdRef.current;
      const isCurrentValidation = () =>
        mountedRef.current &&
        !redirectingRef.current &&
        validationIdRef.current === validationId;

      try {
        if (isSessionLifecycleLocked()) {
          lockAndRedirect({ sessionExpired: true }, true);
          return;
        }

        if (isSessionIdle(lastActivityAtRef.current, Date.now())) {
          lockAndRedirect({ sessionExpired: true }, true);
          return;
        }

        const [status] = await Promise.all([
          queryClient.fetchQuery(sessionQueries.status()),
          queryClient.fetchQuery({ ...workspaceMemberQueries.current(), staleTime: 0 }),
        ]);

        if (!isCurrentValidation()) return;

        if (isSessionLifecycleLocked()) {
          lockAndRedirect({ sessionExpired: true }, true);
          return;
        }

        if (!status.authenticated) {
          lockAndRedirect({ sessionExpired: true }, false);
          return;
        }

        const now = Date.now();
        if (isSessionIdle(lastActivityAtRef.current, now)) {
          lockAndRedirect({ sessionExpired: true }, true);
          return;
        }

        const lastActivityAt = lastActivityAtRef.current ?? now;
        if (isSessionLifecycleLocked()) {
          lockAndRedirect({ sessionExpired: true }, true);
          return;
        }

        if (!writeSessionLifecycleState(createActiveSessionLifecycleState(lastActivityAt))) {
          failClosedValidation();
          return;
        }

        if (!isCurrentValidation()) return;

        if (isSessionLifecycleLocked()) {
          lockAndRedirect({ sessionExpired: true }, true);
          return;
        }

        lastActivityAtRef.current = lastActivityAt;
        persistedActivityAtRef.current = lastActivityAt;
        updateGuardState('ready');
        scheduleIdleCheck();
      } catch (error) {
        if (!isCurrentValidation()) return;

        if (error instanceof ApiError && error.status === 401) {
          lockAndRedirect({ sessionExpired: true }, false);
        } else if (error instanceof ApiError && error.status === 403) {
          lockAndRedirect({ authError: 'access_denied' }, false);
        } else {
          failClosedValidation();
        }
      } finally {
        if (validationIdRef.current === validationId) {
          validationInFlightRef.current = false;
        }
      }
    };

    const handleResume = () => {
      if (redirectingRef.current || guardStateRef.current === 'locked') return;
      void validateSession();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleResume();
      }
    };

    const handleLifecycleLock = () => {
      lockAndRedirect({ sessionExpired: true }, true, false);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_LIFECYCLE_STORAGE_KEY) return;

      if (event.storageArea !== null) {
        try {
          if (event.storageArea !== window.localStorage) return;
        } catch {
          return;
        }
      }

      if (isLockedSessionLifecycleValue(event.newValue)) {
        lockAndRedirect({ sessionExpired: true }, true);
      }
    };

    const handleOnline = () => {
      if (guardStateRef.current !== 'checking' || redirectingRef.current) return;
      void validateSession();
    };

    const handlePeriodicRevalidation = () => {
      if (
        document.visibilityState !== 'visible' ||
        (guardStateRef.current !== 'ready' && guardStateRef.current !== 'checking') ||
        redirectingRef.current
      ) {
        return;
      }

      void validateSession();
    };

    const handleActivity = () => {
      if (guardStateRef.current !== 'ready' || redirectingRef.current) return;

      const now = Date.now();
      lastActivityAtRef.current = now;

      if (shouldPersistSessionActivity(persistedActivityAtRef.current, now)) {
        if (!writeSessionLifecycleState(createActiveSessionLifecycleState(now))) {
          failClosedValidation();
          return;
        }

        persistedActivityAtRef.current = now;
      }

      scheduleIdleCheck();
    };

    window.addEventListener('focus', handleResume);
    window.addEventListener('pageshow', handleResume);
    window.addEventListener(SESSION_LIFECYCLE_LOCK_EVENT, handleLifecycleLock);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pointerdown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity, { passive: true });
    const revalidationInterval = window.setInterval(
      handlePeriodicRevalidation,
      SESSION_REVALIDATION_INTERVAL_MS,
    );

    if (isSessionLifecycleLocked() || isSessionIdle(lastActivityAtRef.current, Date.now())) {
      lockAndRedirect({ sessionExpired: true }, true);
    } else {
      void validateSession();
    }

    return () => {
      mountedRef.current = false;
      validationIdRef.current += 1;
      validationInFlightRef.current = false;
      clearIdleTimer();
      window.clearInterval(revalidationInterval);
      window.removeEventListener('focus', handleResume);
      window.removeEventListener('pageshow', handleResume);
      window.removeEventListener(SESSION_LIFECYCLE_LOCK_EVENT, handleLifecycleLock);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [navigate, queryClient]);

  return guardState === 'ready';
}
