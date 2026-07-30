import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Flex, Skeleton } from 'antd';
import { workspaceMemberQueries } from '@/entities/workspace-member';
import { ApiError } from '@/shared/api/httpClient';
import styles from './SessionGuard.module.css';

export function SessionGuard({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { isLoading, isError, error } = useQuery(workspaceMemberQueries.current());

  useEffect(() => {
    if (error instanceof ApiError && error.status === 403) {
      void navigate({ to: '/', search: { authError: 'access_denied' } });
    }
  }, [error, navigate]);

  if (isLoading) {
    return (
      <Flex align="center" justify="center" className={styles.loading}>
        <Skeleton active paragraph={{ rows: 4 }} className={styles.skeleton} />
      </Flex>
    );
  }

  if (isError) {
    return null;
  }

  return <>{children}</>;
}
