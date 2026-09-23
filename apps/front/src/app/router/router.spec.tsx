import { act, render, screen } from '@testing-library/react';
import { createElement, type ComponentType } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/shared/i18n';
import {
  findAccessibleNestedSection,
  projectSectionModules,
  router,
  RouteFallback,
  staffSectionModules,
} from './router';

const routeAccessMocks = vi.hoisted(() => ({
  allowed: [] as string[],
  isAdmin: false,
  isPending: false,
}));

vi.mock('@/entities/workspace-member', () => ({
  useWorkspaceAccess: () => ({
    canAccess: (module: string) => routeAccessMocks.allowed.includes(module),
    isAdmin: routeAccessMocks.isAdmin,
    isPending: routeAccessMocks.isPending,
  }),
}));

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

describe('application routes', () => {
  it('keeps hierarchy and compatibility paths registered', () => {
    expect(Object.keys(router.routesByPath)).toEqual(
      expect.arrayContaining([
        '/companies',
        '/companies/$clientId/projects',
        '/projects',
        '/projects/$projectId',
        '/changelog',
      ]),
    );
  });

  it('blocks direct routes when a member has no visible sections', async () => {
    await i18n.changeLanguage('es');
    routeAccessMocks.allowed = [];
    const DashboardRoute = router.routesByPath['/dashboard'].options.component;

    render(createElement(DashboardRoute as ComponentType));

    expect(await screen.findByText('No tienes acceso a ninguna sección')).toBeInTheDocument();
  });

  it('requires both project and nested section access', () => {
    const allowed = new Set(['projects', 'equipment']);
    const canAccess = (module: string) => allowed.has(module);

    expect(
      findAccessibleNestedSection('documents', projectSectionModules, ['documents', 'equipment'], canAccess),
    ).toBe('equipment');
  });

  it('requires Staff, Calendar, and Projects for the nested staff schedule', () => {
    const calendarOnly = new Set(['staff', 'calendar']);
    const canAccessCalendarOnly = (module: string) => calendarOnly.has(module);

    expect(
      findAccessibleNestedSection(
        'schedule',
        staffSectionModules,
        ['documents', 'payrolls', 'schedule', 'profile'],
        canAccessCalendarOnly,
      ),
    ).toBe('profile');

    const calendarAndProjects = new Set(['staff', 'calendar', 'projects']);
    const canAccessCalendarAndProjects = (module: string) => calendarAndProjects.has(module);

    expect(
      findAccessibleNestedSection(
        'schedule',
        staffSectionModules,
        ['documents', 'payrolls', 'schedule', 'profile'],
        canAccessCalendarAndProjects,
      ),
    ).toBe('schedule');
  });
});
