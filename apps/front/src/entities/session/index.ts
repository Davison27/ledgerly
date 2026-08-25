export { bootstrapFirstAdmin, logout, signInWithGoogle } from './api/session.api';
export { sessionQueries } from './api/session.queries';
export type { AuthStatusDto, BootstrapFirstAdminResultDto } from './api/types';
export {
  clearSessionLifecycleState,
  createActiveSessionLifecycleState,
  createLockedSessionLifecycleState,
  isLockedSessionLifecycleValue,
  isSessionIdle,
  isSessionLifecycleLocked,
  lockSessionLifecycle,
  readSessionLifecycleState,
  shouldPersistSessionActivity,
  writeSessionLifecycleState,
  SESSION_ACTIVITY_PERSIST_INTERVAL_MS,
  SESSION_INACTIVITY_TIMEOUT_MS,
  SESSION_LIFECYCLE_LOCK_EVENT,
  SESSION_LIFECYCLE_STORAGE_KEY,
} from './model/sessionLifecycle';
export type { SessionLifecycleState } from './model/sessionLifecycle';
