import type { ReactNode } from 'react';
import { Flex, Typography } from 'antd';
import { SPACE } from '../../config/theme';
import styles from './PageHeader.module.css';

const { Title, Text } = Typography;

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <Flex align="center" justify="space-between" gap={SPACE.md} wrap="wrap">
        <Title level={2} className={styles.title} data-with-subtitle={Boolean(subtitle)}>
          {title}
        </Title>
        {actions}
      </Flex>
      {subtitle && (
        <Text type="secondary" className={styles.subtitle}>
          {subtitle}
        </Text>
      )}
    </div>
  );
}
