import type { ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Flex, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import typography from '../typography.module.css';
import styles from './DetailPageHeader.module.css';

const { Title, Text } = Typography;

export interface DetailPageHeaderProps {
  backTo: string;
  backLabel: string;
  avatar: ReactNode;
  title: string;
  subtitle?: ReactNode;
  sections: ReactNode;
}

export function DetailPageHeader({
  backTo,
  backLabel,
  avatar,
  title,
  subtitle,
  sections,
}: DetailPageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className={styles.header}>
      <Flex align="center" gap={16} className={styles.identity}>
        <Button
          type="text"
          aria-label={backLabel}
          icon={<ArrowLeftOutlined />}
          onClick={() => void navigate({ to: backTo })}
          className={styles.backButton}
        />
        <Flex align="center" gap={10}>
          {avatar}
          <Flex align="baseline" gap={8}>
            <Title level={3} className={styles.title}>
              {title}
            </Title>
            {subtitle && (
              <Text type="secondary" className={typography.caption}>
                {subtitle}
              </Text>
            )}
          </Flex>
        </Flex>
      </Flex>
      {sections}
    </div>
  );
}
