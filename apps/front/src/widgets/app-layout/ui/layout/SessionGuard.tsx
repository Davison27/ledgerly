import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Flex, Skeleton } from 'antd';
import { workspaceMemberQueries } from '@/entities/workspace-member';
import styles from './SessionGuard.module.css';

export function SessionGuard({ children }: { children: ReactNode }) {
  const { isLoading, isError } = useQuery(workspaceMemberQueries.current());

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
