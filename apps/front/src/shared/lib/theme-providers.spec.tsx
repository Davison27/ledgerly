import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandColorProvider, useBrandColor } from './brand-color/BrandColorProvider';
import { ThemeModeProvider, useThemeMode } from './theme-mode/ThemeModeProvider';
import { BRAND_DEFAULT } from '@/shared/config/theme';

function themeWrapper({ children }: { children: ReactNode }) {
  return <ThemeModeProvider>{children}</ThemeModeProvider>;
}

function brandWrapper({ children }: { children: ReactNode }) {
  return <BrandColorProvider>{children}</BrandColorProvider>;
}

describe('theme and brand color providers', () => {
  it('restores the stored theme and persists changes and toggles', () => {
    window.localStorage.setItem('ledgerly:theme', 'dark');
    const { result } = renderHook(() => useThemeMode(), { wrapper: themeWrapper });

    expect(result.current.mode).toBe('dark');
    act(() => result.current.toggle());
    expect(result.current.mode).toBe('light');
    expect(window.localStorage.getItem('ledgerly:theme')).toBe('light');
    act(() => result.current.setMode('dark'));
    expect(result.current.mode).toBe('dark');
    expect(window.localStorage.getItem('ledgerly:theme')).toBe('dark');
  });

  it('restores, persists and clears a custom brand color', () => {
    window.localStorage.setItem('ledgerly:brandColor', '#123456');
    const { result } = renderHook(() => useBrandColor(), { wrapper: brandWrapper });

    expect(result.current.brandColor).toBe('#123456');
    act(() => result.current.setBrandColor('#abcdef'));
    expect(result.current.brandColor).toBe('#abcdef');
    expect(window.localStorage.getItem('ledgerly:brandColor')).toBe('#abcdef');
    act(() => result.current.setBrandColor(undefined));
    expect(result.current.brandColor).toBe(BRAND_DEFAULT);
    expect(window.localStorage.getItem('ledgerly:brandColor')).toBeNull();
  });

  it('rejects provider hooks outside their provider', () => {
    expect(() => renderHook(() => useThemeMode())).toThrow(
      'useThemeMode debe usarse dentro de ThemeModeProvider',
    );
    expect(() => renderHook(() => useBrandColor())).toThrow(
      'useBrandColor debe usarse dentro de BrandColorProvider',
    );
  });
});
