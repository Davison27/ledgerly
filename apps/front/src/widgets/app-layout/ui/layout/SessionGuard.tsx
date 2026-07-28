import { useEffect, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Flex, Skeleton } from 'antd';
import { ApiError } from '@/shared/api/httpClient';
import { workspaceMemberQueries } from '@/entities/workspace-member';
import styles from './SessionGuard.module.css';

export function SessionGuard({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { isLoading, isError, error } = useQuery(workspaceMemberQueries.current());

  useEffect(() => {
    if (isError && error instanceof ApiError && error.status === 401) {
      void navigate({ to: '/' });
    }
  }, [isError, error, navigate]);

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
