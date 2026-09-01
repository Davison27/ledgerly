import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/shared/i18n';
import { RouteFallback } from './router';

describe('RouteFallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await i18n.changeLanguage('es');
  });

  it('does not announce a loading state before the delay and shows it at 120 milliseconds', () => {
    render(<RouteFallback />);

    act(() => {
      vi.advanceTimersByTime(119);
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(document.querySelector('.ant-spin')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.getByRole('status')).toHaveTextContent('Cargando página…');
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(document.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('uses the selected English translation', async () => {
    await i18n.changeLanguage('en');
    render(<RouteFallback />);

    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(screen.getByRole('status')).toHaveTextContent('Loading page…');
  });

  it('clears the pending timer when unmounted before the delay', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { unmount } = render(<RouteFallback />);

    unmount();

    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(clearTimeoutSpy).toHaveBeenCalledOnce();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
