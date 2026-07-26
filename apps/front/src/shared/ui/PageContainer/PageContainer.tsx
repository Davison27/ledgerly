import type { ReactNode } from 'react';
import styles from './PageContainer.module.css';

export interface PageContainerProps {
  children: ReactNode;
  maxWidth?: number | string;
}

export function PageContainer({ children, maxWidth }: PageContainerProps) {
  return (
    <div className={styles.container} style={maxWidth !== undefined ? { maxWidth } : undefined}>
      {children}
    </div>
  );
}
