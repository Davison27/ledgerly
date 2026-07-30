import { useCallback, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  mapNotificationDto,
  markAllNotificationsRead,
  markNotificationRead,
  resolveNotification,
  notificationQueries,
  notificationTarget,
  type NotificationView,
} from '@/entities/notification';

const PAGE_SIZE = 20;

export function useNotificationCenter() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'unread' | 'open' | 'resolved' | 'all'>('open');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: unreadCount = 0 } = useQuery({
    ...notificationQueries.unreadCount(),
    select: (data) => data.count,
  });

  const {
    data,
    isPending: loading,
    isError: loadError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    ...notificationQueries.list(PAGE_SIZE, status),
    enabled: open,
  });

  const items = useMemo<NotificationView[]>(
    () => (data?.pages ?? []).flatMap((page) => page.items.map(mapNotificationDto)),
    [data],
  );

  const invalidateAll = useCallback(
    () => queryClient.invalidateQueries({ queryKey: notificationQueries.all }),
    [queryClient],
  );

  const markRead = useCallback((id: string) => markNotificationRead(id).then(invalidateAll), [invalidateAll]);

  const markAllRead = useCallback(
    () => void markAllNotificationsRead().then(invalidateAll),
    [invalidateAll],
  );

  const resolve = useCallback((id: string) => void resolveNotification(id).then(invalidateAll), [invalidateAll]);

  const onSelect = useCallback(
    (view: NotificationView) => {
      setOpen(false);

      const target = notificationTarget(view);
      if (target?.kind === 'project') {
        void navigate({ to: '/projects/$projectId', params: { projectId: target.projectId } });
      } else if (target?.kind === 'staffMember') {
        void navigate({ to: '/staff/$staffMemberId', params: { staffMemberId: target.staffMemberId } });
      } else if (target?.kind === 'calendar') {
        void navigate({ to: '/calendar' });
      }

      if (!view.readAt) void markRead(view.id);
    },
    [navigate, markRead],
  );

  return {
    open,
    setOpen,
    status,
    setStatus,
    unreadCount,
    items,
    loading,
    loadError,
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
    loadMore: () => void fetchNextPage(),
    onSelect,
    onMarkAllRead: markAllRead,
    onResolve: resolve,
  };
}

export type UseNotificationCenterResult = ReturnType<typeof useNotificationCenter>;
