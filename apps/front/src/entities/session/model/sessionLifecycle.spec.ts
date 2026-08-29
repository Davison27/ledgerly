import { beforeEach, describe, expect, it } from 'vitest';
import {
  SESSION_ACTIVITY_PERSIST_INTERVAL_MS,
  SESSION_INACTIVITY_TIMEOUT_MS,
  clearSessionLifecycleState,
  createActiveSessionLifecycleState,
  createLockedSessionLifecycleState,
  isLockedSessionLifecycleValue,
  isSessionIdle,
  readSessionLifecycleState,
  shouldPersistSessionActivity,
  writeSessionLifecycleState,
} from './sessionLifecycle';

describe('sessionLifecycle', () => {
  beforeEach(() => {
    clearSessionLifecycleState();
  });

  it('creates active and locked states with the supplied timestamp', () => {
    expect(createActiveSessionLifecycleState(100)).toEqual({ lastActivityAt: 100, locked: false });
    expect(createLockedSessionLifecycleState(100)).toEqual({ lastActivityAt: 100, locked: true });
  });

  it('detects idle sessions at the inactivity threshold', () => {
    expect(isSessionIdle(100, 100 + SESSION_INACTIVITY_TIMEOUT_MS - 1)).toBe(false);
    expect(isSessionIdle(100, 100 + SESSION_INACTIVITY_TIMEOUT_MS)).toBe(true);
    expect(isSessionIdle(null, Number.MAX_SAFE_INTEGER)).toBe(false);
  });

  it('only persists activity when the interval has elapsed', () => {
    expect(shouldPersistSessionActivity(null, 100)).toBe(true);
    expect(shouldPersistSessionActivity(100, 100 + SESSION_ACTIVITY_PERSIST_INTERVAL_MS - 1)).toBe(
      false,
    );
    expect(shouldPersistSessionActivity(100, 100 + SESSION_ACTIVITY_PERSIST_INTERVAL_MS)).toBe(
      true,
    );
  });

  it('round-trips valid state through the supplied storage', () => {
    const storage = new StorageMock();
    const state = createActiveSessionLifecycleState(123);

    expect(writeSessionLifecycleState(state, storage)).toBe(true);
    expect(readSessionLifecycleState(storage)).toEqual(state);
  });

  it('fails closed for malformed persisted state', () => {
    const storage = new StorageMock();
    storage.setItem('ledgerly.session.lifecycle', '{"locked":"no"}');

    expect(readSessionLifecycleState(storage)).toEqual({ lastActivityAt: null, locked: true });
    expect(isLockedSessionLifecycleValue(storage.getItem('ledgerly.session.lifecycle'))).toBe(true);
  });
});

class StorageMock implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
