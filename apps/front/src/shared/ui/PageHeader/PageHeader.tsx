import type { ReactNode } from 'react';
import { Flex, Typography } from 'antd';
import { SPACE } from '../../config/theme';

const { Title, Text } = Typography;

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: SPACE.xxl }}>
      <Flex align="center" justify="space-between" gap={SPACE.md} wrap="wrap">
        <Title level={2} style={{ marginTop: 0, marginBottom: subtitle ? SPACE.xs : 0 }}>
          {title}
        </Title>
        {actions}
      </Flex>
      {subtitle && (
        <Text type="secondary" style={{ display: 'block' }}>
          {subtitle}
        </Text>
      )}
    </div>
  );
}
