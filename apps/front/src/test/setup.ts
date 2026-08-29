import '@testing-library/jest-dom/vitest';
import '@/shared/i18n';
import { cleanup } from '@testing-library/react';
import i18n from '@/shared/i18n';
import { afterEach, beforeEach, vi } from 'vitest';
import { clearSessionLifecycleState } from '@/entities/session/model/sessionLifecycle';

beforeEach(async () => {
  await i18n.changeLanguage('es');
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string): MediaQueryList => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
  }
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class implements ResizeObserver {
      observe(): void {}

      unobserve(): void {}

      disconnect(): void {}
    };
  }
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  clearSessionLifecycleState();
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.cookie = 'lg_csrf=; Max-Age=0; Path=/';
});
