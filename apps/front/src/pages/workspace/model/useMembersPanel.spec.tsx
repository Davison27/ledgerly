import { App } from 'antd';
import { act, renderHook } from '@testing-library/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceMemberDto } from '@/entities/workspace-member';
import { useMembersPanel } from './useMembersPanel';

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return { ...actual, useQuery: vi.fn(), useQueryClient: vi.fn() };
});

const members: WorkspaceMemberDto[] = [
  {
    id: 'admin-active',
    name: 'Active admin',
    email: 'active-admin@example.com',
    role: 'admin',
    permissions: {
      dashboard: 'view',
      projects: 'edit',
      calendar: 'edit',
      documents: 'edit',
      suppliers: 'edit',
      equipment: 'edit',
      staff: 'edit',
      planning: 'edit',
    },
    status: 'active',
    invitedAt: '2026-09-01T00:00:00.000Z',
    joinedAt: '2026-09-01T00:00:00.000Z',
    lastActiveAt: null,
    auth: null,
  },
  {
    id: 'admin-disabled',
    name: 'Disabled admin',
    email: 'disabled-admin@example.com',
    role: 'admin',
    permissions: {
      dashboard: 'view',
      projects: 'edit',
      calendar: 'edit',
      documents: 'edit',
      suppliers: 'edit',
      equipment: 'edit',
      staff: 'edit',
      planning: 'edit',
    },
    status: 'disabled',
    invitedAt: '2026-09-02T00:00:00.000Z',
    joinedAt: '2026-09-02T00:00:00.000Z',
    lastActiveAt: null,
    auth: null,
  },
  {
    id: 'member-active',
    name: 'Active member',
    email: 'member@example.com',
    role: 'member',
    permissions: {
      dashboard: 'view',
      projects: 'view',
      calendar: 'none',
      documents: 'none',
      suppliers: 'none',
      equipment: 'none',
      staff: 'none',
      planning: 'none',
    },
    status: 'active',
    invitedAt: '2026-09-03T00:00:00.000Z',
    joinedAt: '2026-09-03T00:00:00.000Z',
    lastActiveAt: null,
    auth: null,
  },
];

describe('useMembersPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQuery).mockImplementation(
      (options) =>
        ({
          data: options.queryKey.at(-1) === 'list' ? members : members[2],
          isPending: false,
          isError: false,
          refetch: vi.fn(),
        }) as never,
    );
    vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries: vi.fn() } as never);
  });

  it('filters by explicit member role and protects self and the last active administrator', () => {
    const { result } = renderHook(() => useMembersPanel(), {
      wrapper: ({ children }) => <App>{children}</App>,
    });

    expect(result.current.stats.adminCount).toBe(2);
    expect(result.current.canEditAccess(members[2]!)).toBe(false);
    expect(result.current.canToggleEnabled(members[2]!)).toBe(false);
    expect(result.current.statusBlockReason(members[2]!)).toBe('self');
    expect(result.current.revokeBlockReason(members[0]!)).toBe('lastAdmin');
    expect(result.current.statusBlockReason(members[0]!)).toBe('lastAdmin');
    expect(result.current.revokeBlockReason(members[1]!)).toBe(null);

    act(() => result.current.setRoleFilter('member'));

    expect(result.current.filtered.map((member) => member.id)).toEqual(['member-active']);
  });
});
