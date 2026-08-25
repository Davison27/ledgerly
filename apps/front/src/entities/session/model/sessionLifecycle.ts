export const SESSION_INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
export const SESSION_ACTIVITY_PERSIST_INTERVAL_MS = 30 * 1000;

export const SESSION_LIFECYCLE_STORAGE_KEY = 'ledgerly.session.lifecycle';
export const SESSION_LIFECYCLE_LOCK_EVENT = 'ledgerly.session.lifecycle.lock';

export interface SessionLifecycleState {
  lastActivityAt: number | null;
  locked: boolean;
}

const EMPTY_STATE: SessionLifecycleState = {
  lastActivityAt: null,
  locked: false,
};

let inMemoryLifecycleLocked = false;

function getStorageCandidates(storage?: Storage): Storage[] {
  if (storage) return [storage];
  if (typeof window === 'undefined') return [];

  const candidates: Storage[] = [];

  try {
    candidates.push(window.localStorage);
  } catch {
    return getSessionStorageCandidate();
  }

  try {
    const sessionStorage = window.sessionStorage;
    if (!candidates.includes(sessionStorage)) {
      candidates.push(sessionStorage);
    }
  } catch {
    return candidates;
  }

  return candidates;
}

function getSessionStorageCandidate(): Storage[] {
  if (typeof window === 'undefined') return [];

  try {
    return [window.sessionStorage];
  } catch {
    return [];
  }
}

function lockedState(): SessionLifecycleState {
  return { ...EMPTY_STATE, locked: true };
}

function parseSessionLifecycleState(serialized: string | null): SessionLifecycleState {
  if (!serialized) return { ...EMPTY_STATE };

  try {
    const value: unknown = JSON.parse(serialized);
    if (!value || typeof value !== 'object') return lockedState();

    const record = value as { lastActivityAt?: unknown; locked?: unknown };
    if (typeof record.locked !== 'boolean' || !('lastActivityAt' in record)) {
      return lockedState();
    }

    if (
      record.lastActivityAt !== null &&
      (typeof record.lastActivityAt !== 'number' || !Number.isFinite(record.lastActivityAt))
    ) {
      return lockedState();
    }

    return {
      lastActivityAt: record.lastActivityAt,
      locked: record.locked,
    };
  } catch {
    return lockedState();
  }
}

export function readSessionLifecycleState(storage?: Storage): SessionLifecycleState {
  if (inMemoryLifecycleLocked) return lockedState();

  const candidates = getStorageCandidates(storage);
  if (candidates.length === 0) {
    inMemoryLifecycleLocked = true;
    return lockedState();
  }

  let readableStorageCount = 0;
  let persistedState: SessionLifecycleState | undefined;

  for (const target of candidates) {
    let serialized: string | null;
    try {
      serialized = target.getItem(SESSION_LIFECYCLE_STORAGE_KEY);
      readableStorageCount += 1;
    } catch {
      continue;
    }

    if (!serialized) continue;

    const state = parseSessionLifecycleState(serialized);
    if (state.locked) {
      inMemoryLifecycleLocked = true;
      return state;
    }

    persistedState ??= state;
  }

  if (readableStorageCount === 0) {
    inMemoryLifecycleLocked = true;
    return lockedState();
  }

  return persistedState ?? { ...EMPTY_STATE };
}

export function isLockedSessionLifecycleValue(value: string | null): boolean {
  return parseSessionLifecycleState(value).locked;
}

export function writeSessionLifecycleState(
  state: SessionLifecycleState,
  storage?: Storage,
): boolean {
  if (inMemoryLifecycleLocked && !state.locked) return false;
  if (state.locked) inMemoryLifecycleLocked = true;

  const serialized = JSON.stringify(state);
  for (const target of getStorageCandidates(storage)) {
    try {
      target.setItem(SESSION_LIFECYCLE_STORAGE_KEY, serialized);
      return true;
    } catch {
      continue;
    }
  }

  inMemoryLifecycleLocked = true;
  return false;
}

export function clearSessionLifecycleState(storage?: Storage): void {
  inMemoryLifecycleLocked = false;

  for (const target of getStorageCandidates(storage)) {
    try {
      target.removeItem(SESSION_LIFECYCLE_STORAGE_KEY);
    } catch {
      continue;
    }
  }
}

export function createActiveSessionLifecycleState(now: number): SessionLifecycleState {
  return { lastActivityAt: now, locked: false };
}

export function createLockedSessionLifecycleState(now: number): SessionLifecycleState {
  return { lastActivityAt: now, locked: true };
}

export function isSessionIdle(lastActivityAt: number | null, now: number): boolean {
  return lastActivityAt !== null && now >= lastActivityAt + SESSION_INACTIVITY_TIMEOUT_MS;
}

export function shouldPersistSessionActivity(
  lastPersistedAt: number | null,
  now: number,
): boolean {
  return (
    lastPersistedAt === null ||
    now >= lastPersistedAt + SESSION_ACTIVITY_PERSIST_INTERVAL_MS
  );
}

export function isSessionLifecycleLocked(storage?: Storage): boolean {
  return readSessionLifecycleState(storage).locked;
}

export function lockSessionLifecycle(now = Date.now(), storage?: Storage): void {
  writeSessionLifecycleState(createLockedSessionLifecycleState(now), storage);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SESSION_LIFECYCLE_LOCK_EVENT));
  }
}
