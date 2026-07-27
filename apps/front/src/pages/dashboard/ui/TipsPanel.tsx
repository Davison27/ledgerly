import { Alert, Card, Flex } from 'antd';
import { useTranslation } from 'react-i18next';
import { BulbOutlined } from '@ant-design/icons';
import type { Tip } from '../model/tips';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import dashboard from './dashboard.module.css';

export interface TipsPanelProps {
  tips: Tip[];
}

export function TipsPanel({ tips }: TipsPanelProps) {
  const { t } = useTranslation();

  return (
    <Card size="small" title={t('dashboard.tips.title')} className={dashboard.card}>
      {tips.length === 0 ? (
        <EmptyHint icon={<BulbOutlined />} title={t('dashboard.tips.generic')} />
      ) : (
        <Flex vertical gap={8}>
          {tips.map((tip) => (
            <Alert
              key={tip.id}
              type={tip.severity}
              message={t(tip.messageKey, tip.values)}
              showIcon
            />
          ))}
        </Flex>
      )}
    </Card>
  );
}
