import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationView } from '@/entities/notification';
import { useNotificationCenter } from './useNotificationCenter';

const notificationMocks = vi.hoisted(() => ({
  allowed: [] as string[],
  navigate: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  resolve: vi.fn(),
  invalidateQueries: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: () => ({
    data: undefined,
    isPending: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  }),
  useQuery: () => ({ data: 0 }),
  useQueryClient: () => ({ invalidateQueries: notificationMocks.invalidateQueries }),
}));

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => notificationMocks.navigate }));

vi.mock('@/entities/notification', () => ({
  mapNotificationDto: (value: unknown) => value,
  markAllNotificationsRead: notificationMocks.markAllRead,
  markNotificationRead: notificationMocks.markRead,
  resolveNotification: notificationMocks.resolve,
  notificationQueries: {
    all: ['notifications'],
    unreadCount: () => ({ queryKey: ['notifications', 'unread'] }),
    list: () => ({ queryKey: ['notifications', 'list'] }),
  },
  notificationTarget: (view: NotificationView) => {
    if (view.resource.kind === 'document' && view.resource.projectId) {
      return { kind: 'project', projectId: view.resource.projectId };
    }
    if (view.resource.kind === 'staff_member' && view.resource.id) {
      return { kind: 'staffMember', staffMemberId: view.resource.id };
    }
    if (view.resource.kind === 'schedule_event') return { kind: 'calendar' };
    return null;
  },
}));

vi.mock('@/entities/workspace-member', () => ({
  useWorkspaceAccess: () => ({
    canAccess: (module: string) => notificationMocks.allowed.includes(module),
  }),
}));

function createNotification(
  resource: NotificationView['resource'],
  conflictKind: NotificationView['context']['conflictKind'] = null,
): NotificationView {
  return {
    id: 'notification-1',
    type: 'schedule_conflict',
    severity: 'warning',
    createdAt: new Date('2026-09-23T10:00:00.000Z'),
    readAt: null,
    resolvedAt: null,
    resource,
    context: {
      subject: 'Subject',
      related: null,
      date: null,
      amount: null,
      conflictKind,
    },
  };
}

describe('useNotificationCenter destination access', () => {
  beforeEach(() => {
    notificationMocks.allowed = [];
    notificationMocks.navigate.mockReset();
    notificationMocks.markRead.mockReset().mockResolvedValue(undefined);
    notificationMocks.markAllRead.mockReset().mockResolvedValue(undefined);
    notificationMocks.resolve.mockReset().mockResolvedValue(undefined);
    notificationMocks.invalidateQueries.mockReset().mockResolvedValue(undefined);
  });

  it('requires Documents and Projects to open a project document', () => {
    const { result, rerender } = renderHook(() => useNotificationCenter());
    const view = createNotification({ kind: 'document', id: 'document-1', projectId: 'project-1' });

    expect(result.current.canViewTarget(view)).toBe(false);

    notificationMocks.allowed = ['documents'];
    rerender();
    expect(result.current.canViewTarget(view)).toBe(false);

    notificationMocks.allowed = ['documents', 'projects'];
    rerender();
    expect(result.current.canViewTarget(view)).toBe(true);
  });

  it('requires Calendar and the linked Equipment grant for equipment conflicts', () => {
    const { result, rerender } = renderHook(() => useNotificationCenter());
    const view = createNotification(
      { kind: 'schedule_event', id: 'event-1', projectId: null },
      'equipment_overallocated',
    );

    notificationMocks.allowed = ['calendar'];
    rerender();
    expect(result.current.canViewTarget(view)).toBe(false);

    notificationMocks.allowed = ['calendar', 'equipment'];
    rerender();
    expect(result.current.canViewTarget(view)).toBe(true);
  });

  it('does not mark or navigate a notification whose destination is not visible', async () => {
    const { result } = renderHook(() => useNotificationCenter());
    const view = createNotification({ kind: 'document', id: 'document-1', projectId: 'project-1' });

    await act(async () => {
      await result.current.onView(view);
    });

    expect(notificationMocks.markRead).not.toHaveBeenCalled();
    expect(notificationMocks.navigate).not.toHaveBeenCalled();
  });
});
