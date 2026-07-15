import { Card, Flex, Typography, theme } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { formatEur, formatPct } from './data';

const { Text } = Typography;
const { useToken } = theme;

export interface ProfitSummaryProps {
  profit: number;
  margin: number;
}

export function ProfitSummary({ profit, margin }: ProfitSummaryProps) {
  const { t } = useTranslation();
  const { token } = useToken();

  const isProfitable = profit >= 0;
  const tone = isProfitable ? token.colorSuccess : token.colorError;
  const Icon = isProfitable ? ArrowUpOutlined : ArrowDownOutlined;

  return (
    <Card
      style={{
        borderColor: tone,
        background: isProfitable ? token.colorSuccessBg : token.colorErrorBg,
      }}
    >
      <Flex gap={32} wrap align="center">
        <Flex align="center" gap={12}>
          <Flex
            align="center"
            justify="center"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: tone,
              flex: 'none',
            }}
          >
            <Icon style={{ color: token.colorWhite, fontSize: 20 }} />
          </Flex>
          <div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {t('projects.dashboard.profit.headline')}
            </Text>
            <div style={{ fontSize: 15, fontWeight: 600, color: tone }}>
              {isProfitable
                ? t('projects.dashboard.profit.profitable')
                : t('projects.dashboard.profit.unprofitable')}
            </div>
          </div>
        </Flex>

        <Flex gap={32} wrap>
          <div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {t('projects.dashboard.profit.net')}
            </Text>
            <div
              style={{
                marginTop: 4,
                fontSize: 30,
                fontWeight: 600,
                lineHeight: 1.2,
                color: tone,
              }}
            >
              {formatEur(profit)}
            </div>
          </div>

          <div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {t('projects.dashboard.profit.margin')}
            </Text>
            <div
              style={{
                marginTop: 4,
                fontSize: 30,
                fontWeight: 600,
                lineHeight: 1.2,
                color: tone,
              }}
            >
              {formatPct(margin)}
            </div>
          </div>
        </Flex>
      </Flex>
    </Card>
  );
}
