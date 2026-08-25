import type { ReactNode } from 'react';
import { Flex, Skeleton } from 'antd';
import { useSessionGuard } from '../../model/useSessionGuard';
import styles from './SessionGuard.module.css';

export function SessionGuard({ children }: { children: ReactNode }) {
  const isReady = useSessionGuard();

  if (!isReady) {
    return (
      <Flex align="center" justify="center" className={styles.loading}>
        <Skeleton active paragraph={{ rows: 4 }} className={styles.skeleton} />
      </Flex>
    );
  }

  return <>{children}</>;
}
