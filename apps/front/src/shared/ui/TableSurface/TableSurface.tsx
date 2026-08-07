import type { ReactNode } from 'react';
import styles from './TableSurface.module.css';

export interface TableSurfaceProps {
  children: ReactNode;
}

export function TableSurface({ children }: TableSurfaceProps) {
  return <div className={styles.surface}>{children}</div>;
}
