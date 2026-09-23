import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/shared/i18n';
import { useSettingsMenuItems } from './useSettingsMenuItems';

const menuMocks = vi.hoisted(() => ({
  isAdmin: false,
  navigate: vi.fn(),
  canAccess: vi.fn((module: string) => module.length > 0),
}));

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => menuMocks.navigate }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ clear: vi.fn() }) }));
vi.mock('@/entities/session', () => ({ logout: vi.fn() }));
vi.mock('@/entities/workspace-member', () => ({
  useWorkspaceAccess: () => ({
    isAdmin: menuMocks.isAdmin,
    canAccess: (module: string) => menuMocks.isAdmin || menuMocks.canAccess(module),
  }),
}));

describe('useSettingsMenuItems', () => {
  afterEach(async () => {
    menuMocks.isAdmin = false;
    menuMocks.navigate.mockReset();
    menuMocks.canAccess.mockReset();
    menuMocks.canAccess.mockReturnValue(true);
    await i18n.changeLanguage('es');
  });

  it.each([
    { isAdmin: false, label: 'Novedades' },
    { isAdmin: true, label: 'Novedades' },
  ])('provides the changelog entry to all members', async ({ isAdmin, label }) => {
    await i18n.changeLanguage('es');
    menuMocks.isAdmin = isAdmin;
    const { result } = renderHook(() => useSettingsMenuItems());
    const whatsNewItem = result.current?.find(
      (item) => item && 'key' in item && item.key === 'whats-new',
    );

    expect(whatsNewItem).toMatchObject({ key: 'whats-new', label });
    const onClick = whatsNewItem && 'onClick' in whatsNewItem ? whatsNewItem.onClick : undefined;
    expect(onClick).toBeTypeOf('function');
    act(() => {
      if (typeof onClick === 'function') onClick({} as never);
    });
    expect(menuMocks.navigate).toHaveBeenCalledWith({ to: '/changelog' });
  });

  it('hides extraction hints without Documents access', () => {
    menuMocks.canAccess.mockReturnValue(false);

    const { result } = renderHook(() => useSettingsMenuItems());

    expect(result.current?.find((item) => item && 'key' in item && item.key === 'extraction-hints')).toBeUndefined();
  });

  it('shows extraction hints with Documents access', () => {
    menuMocks.canAccess.mockImplementation((module) => module === 'documents');

    const { result } = renderHook(() => useSettingsMenuItems());

    expect(result.current?.find((item) => item && 'key' in item && item.key === 'extraction-hints')).toMatchObject({
      key: 'extraction-hints',
      label: 'Pistas aprendidas',
    });
  });
});
