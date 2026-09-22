import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acknowledgeReleaseNote,
  currentReleaseVersion,
  releaseNoteQueries,
  type ReleaseNoteAcknowledgement,
} from '@/entities/release-note';

export type ReleaseNoticeAction = 'acknowledge' | 'view-changelog';

interface UseReleaseNoticeOptions {
  onViewChangelog: () => void;
}

export function useReleaseNotice({ onViewChangelog }: UseReleaseNoticeOptions) {
  const queryClient = useQueryClient();
  const acknowledgementQuery = useQuery(
    releaseNoteQueries.acknowledgement(currentReleaseVersion),
  );
  const [pendingAction, setPendingAction] = useState<ReleaseNoticeAction | null>(null);
  const queryKey = releaseNoteQueries.acknowledgement(currentReleaseVersion).queryKey;
  const acknowledgementMutation = useMutation({
    mutationFn: () => acknowledgeReleaseNote(currentReleaseVersion),
    onSuccess: async () => {
      queryClient.setQueryData<ReleaseNoteAcknowledgement>(queryKey, (previous) => ({
        acknowledged: true,
        acknowledgedAt: previous?.acknowledgedAt ?? null,
      }));
      await queryClient.invalidateQueries({ queryKey });
    },
  });
  const { mutateAsync } = acknowledgementMutation;
  const { refetch } = acknowledgementQuery;

  const performAction = useCallback(
    async (action: ReleaseNoticeAction) => {
      setPendingAction(action);
      try {
        await mutateAsync();
        setPendingAction(null);
        if (action === 'view-changelog') onViewChangelog();
      } catch {
        return;
      }
    },
    [mutateAsync, onViewChangelog],
  );

  const retryAcknowledgement = useCallback(() => {
    if (pendingAction) void performAction(pendingAction);
  }, [pendingAction, performAction]);

  const retryQuery = useCallback(() => {
    void refetch();
  }, [refetch]);

  return {
    acknowledgement: acknowledgementQuery,
    isAcknowledged: acknowledgementQuery.data?.acknowledged === true,
    isLoading: acknowledgementQuery.isPending,
    isChecking: acknowledgementQuery.isFetching,
    hasQueryError: acknowledgementQuery.isError && acknowledgementQuery.data === undefined,
    mutationError: acknowledgementMutation.error,
    isAcknowledging: acknowledgementMutation.isPending,
    pendingAction,
    performAction,
    retryAcknowledgement,
    retryQuery,
  };
}
