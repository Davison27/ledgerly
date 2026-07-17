import { Alert, Card, Flex } from 'antd';
import { useTranslation } from 'react-i18next';
import type { Tip } from './tips';

export interface TipsPanelProps {
  tips: Tip[];
}

export function TipsPanel({ tips }: TipsPanelProps) {
  const { t } = useTranslation();

  return (
    <Card
      size="small"
      title={t('dashboard.tips.title')}
      style={{ flex: '1 1 320px', minWidth: 300 }}
    >
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
    </Card>
  );
}
