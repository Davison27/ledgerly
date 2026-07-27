import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { getUnreadCount, listNotifications } from './notifications.api';

const UNREAD_COUNT_REFETCH_INTERVAL_MS = 5 * 60 * 1000;
const UNREAD_COUNT_STALE_TIME_MS = 60_000;

export const notificationQueries = {
  all: ['notifications'] as const,
  unreadCount: () =>
    queryOptions({
      queryKey: ['notifications', 'unread-count'] as const,
      queryFn: () => getUnreadCount(),
      refetchInterval: UNREAD_COUNT_REFETCH_INTERVAL_MS,
      refetchOnWindowFocus: true,
      staleTime: UNREAD_COUNT_STALE_TIME_MS,
    }),
  list: (size: number) =>
    infiniteQueryOptions({
      queryKey: ['notifications', 'list', size] as const,
      queryFn: ({ pageParam }) => listNotifications({ page: pageParam, size }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.page * lastPage.size < lastPage.total ? lastPage.page + 1 : undefined,
    }),
};
