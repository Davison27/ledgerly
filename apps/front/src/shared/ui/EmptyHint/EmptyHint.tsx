import type { ReactNode } from 'react';
import { Flex, Typography } from 'antd';
import typography from '../typography.module.css';
import styles from './EmptyHint.module.css';

const { Text } = Typography;

export interface EmptyHintProps {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}

export function EmptyHint({ icon, title, hint, action }: EmptyHintProps) {
  return (
    <Flex vertical align="center" gap={8} className={styles.empty}>
      <span className={styles.icon}>{icon}</span>
      <Text className={`${typography.caption} ${styles.title}`}>{title}</Text>
      {hint && <Text className={`${typography.caption} ${styles.hint}`}>{hint}</Text>}
      {action}
    </Flex>
  );
}
