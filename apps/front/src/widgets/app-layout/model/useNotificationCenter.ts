import { useCallback, useMemo, useRef, useState } from 'react';
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
import { useWorkspaceAccess, type WorkspaceModuleDto } from '@/entities/workspace-member';

const PAGE_SIZE = 20;

function notificationTargetModules(view: NotificationView): WorkspaceModuleDto[] {
  switch (view.resource.kind) {
    case 'document':
      return view.resource.projectId ? ['documents', 'projects'] : ['documents'];
    case 'staff_member':
      return ['staff', 'documents'];
    case 'schedule_event': {
      const modules: WorkspaceModuleDto[] = ['calendar'];
      if (view.resource.projectId) modules.push('projects');
      if (view.context.conflictKind === 'staff_not_hired' || view.context.conflictKind === 'staff_overlap') {
        modules.push('staff');
      }
      if (
        view.context.conflictKind === 'equipment_overallocated' ||
        view.context.conflictKind === 'equipment_stock_unset'
      ) {
        modules.push('equipment');
      }
      if (
        view.context.conflictKind === 'outside_project_dates' ||
        view.context.conflictKind === 'project_not_active'
      ) {
        modules.push('projects');
      }
      return modules;
    }
    case 'none':
      return [];
  }
}

export type NotificationOperation =
  | { kind: 'view'; view: NotificationView }
  | { kind: 'markRead'; notificationId: string }
  | { kind: 'markAllRead' }
  | { kind: 'resolve'; notificationId: string };

export interface NotificationMutationError {
  operation: NotificationOperation;
}

function isSameOperation(left: NotificationOperation | null, right: NotificationOperation | null): boolean {
  if (!left || !right || left.kind !== right.kind) return false;

  switch (left.kind) {
    case 'view':
      return left.view.id === (right.kind === 'view' ? right.view.id : '');
    case 'markRead':
    case 'resolve':
      return left.notificationId ===
        (right.kind === 'markRead' || right.kind === 'resolve' ? right.notificationId : '');
    case 'markAllRead':
      return true;
  }
}

export function useNotificationCenter() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'unread' | 'open' | 'resolved' | 'all'>('open');
  const [activeOperation, setActiveOperation] = useState<NotificationOperation | null>(null);
  const [mutationError, setMutationError] = useState<NotificationMutationError | null>(null);
  const activeOperationRef = useRef<NotificationOperation | null>(null);
  const failedOperationRef = useRef<NotificationOperation | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { canAccess } = useWorkspaceAccess();

  const canViewTarget = useCallback(
    (view: NotificationView) =>
      Boolean(notificationTarget(view)) &&
      notificationTargetModules(view).every((module) => canAccess(module, 'view')),
    [canAccess],
  );

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
    refetch,
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

  const navigateToTarget = useCallback(
    async (view: NotificationView) => {
      if (!canViewTarget(view)) return;

      const target = notificationTarget(view);
      if (target?.kind === 'project') {
        await navigate({ to: '/projects/$projectId', params: { projectId: target.projectId } });
      } else if (target?.kind === 'staffMember') {
        await navigate({ to: '/staff/$staffMemberId', params: { staffMemberId: target.staffMemberId } });
      } else if (target?.kind === 'calendar') {
        await navigate({ to: '/calendar' });
      }
    },
    [canViewTarget, navigate],
  );

  const performOperation = useCallback(
    (operation: NotificationOperation) => {
      switch (operation.kind) {
        case 'view':
        case 'markRead':
          return markNotificationRead(operation.kind === 'view' ? operation.view.id : operation.notificationId);
        case 'markAllRead':
          return markAllNotificationsRead();
        case 'resolve':
          return resolveNotification(operation.notificationId);
      }
    },
    [],
  );

  const executeOperation = useCallback(
    async (operation: NotificationOperation) => {
      if (activeOperationRef.current) return false;

      activeOperationRef.current = operation;
      setActiveOperation(operation);

      try {
        await performOperation(operation);
        await invalidateAll();
        if (isSameOperation(failedOperationRef.current, operation)) {
          failedOperationRef.current = null;
          setMutationError(null);
        }
        return true;
      } catch {
        failedOperationRef.current = operation;
        setMutationError({ operation });
        return false;
      } finally {
        if (isSameOperation(activeOperationRef.current, operation)) {
          activeOperationRef.current = null;
          setActiveOperation(null);
        }
      }
    },
    [invalidateAll, performOperation],
  );

  const onView = useCallback(
    async (view: NotificationView) => {
      if (!canViewTarget(view) || activeOperationRef.current) return;

      if (view.readAt) {
        setOpen(false);
        void navigateToTarget(view);
        return;
      }

      const succeeded = await executeOperation({ kind: 'view', view });
      if (!succeeded) {
        setOpen(true);
        return;
      }

      setOpen(false);
      void navigateToTarget(view);
    },
    [canViewTarget, executeOperation, navigateToTarget],
  );

  const onMarkRead = useCallback(
    (notificationId: string) => executeOperation({ kind: 'markRead', notificationId }),
    [executeOperation],
  );

  const onMarkAllRead = useCallback(
    () => executeOperation({ kind: 'markAllRead' }),
    [executeOperation],
  );

  const onResolve = useCallback(
    (notificationId: string) => executeOperation({ kind: 'resolve', notificationId }),
    [executeOperation],
  );

  const retryMutation = useCallback(async () => {
    const operation = failedOperationRef.current;
    if (!operation || activeOperationRef.current) return;

    const succeeded = await executeOperation(operation);
    if (!succeeded) {
      if (operation.kind === 'view') setOpen(true);
      return;
    }

    if (operation.kind === 'view') {
      setOpen(false);
      if (canViewTarget(operation.view)) void navigateToTarget(operation.view);
    }
  }, [canViewTarget, executeOperation, navigateToTarget]);

  const clearMutationFeedback = useCallback(() => {
    failedOperationRef.current = null;
    setMutationError(null);
  }, []);

  const onOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const retryList = useCallback(() => {
    void refetch();
  }, [refetch]);

  const loadMore = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return {
    open,
    setOpen,
    onOpenChange,
    close,
    status,
    setStatus,
    unreadCount,
    items,
    loading,
    loadError,
    retryList,
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
    loadMore,
    activeOperation,
    mutationError,
    onView,
    canViewTarget,
    onMarkRead,
    onMarkAllRead,
    onResolve,
    retryMutation,
    clearMutationFeedback,
  };
}

export type UseNotificationCenterResult = ReturnType<typeof useNotificationCenter>;
