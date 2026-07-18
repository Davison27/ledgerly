import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App,
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Empty,
  Flex,
  Popconfirm,
  Progress,
  Row,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  type TableColumnsType,
} from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  deleteExtractionHint,
  listExtractionHints,
} from '../../data/api/extraction-hints.api';
import { getExtractionQuality } from '../../data/api/extraction-quality.api';
import type {
  ExtractInvoiceConfidence,
  ExtractInvoiceSource,
  ExtractionHintDto,
  ExtractionQualityDto,
} from '../../data/api/types';

const { Title, Text } = Typography;

const QUALITY_SOURCES: ExtractInvoiceSource[] = ['facturae', 'facturx', 'ubl', 'heuristic'];
const QUALITY_CONFIDENCES: ExtractInvoiceConfidence[] = ['high', 'partial', 'low'];

const CONFIDENCE_COLOR: Record<ExtractInvoiceConfidence, string> = {
  high: 'success',
  partial: 'warning',
  low: 'error',
};

interface IssuerGroup {
  issuerName: string;
  hints: ExtractionHintDto[];
}

function groupByIssuer(hints: ExtractionHintDto[]): IssuerGroup[] {
  const map = new Map<string, ExtractionHintDto[]>();
  for (const hint of hints) {
    const group = map.get(hint.issuerName);
    if (group) {
      group.push(hint);
    } else {
      map.set(hint.issuerName, [hint]);
    }
  }
  return Array.from(map.entries())
    .map(([issuerName, groupHints]) => ({ issuerName, hints: groupHints }))
    .sort((a, b) => a.issuerName.localeCompare(b.issuerName));
}

function QualityPanel() {
  const { t } = useTranslation();
  const [quality, setQuality] = useState<ExtractionQualityDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    getExtractionQuality()
      .then(setQuality)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Flex justify="center" style={{ padding: '48px 0' }}>
        <Spin />
      </Flex>
    );
  }

  if (loadError || !quality) {
    return <Alert type="error" showIcon message={t('extractionHints.quality.loadError')} />;
  }

  if (quality.totalExtractions === 0) {
    return <Empty description={t('extractionHints.quality.empty')} />;
  }

  const total = quality.totalExtractions;

  return (
    <Flex vertical gap={24}>
      <Row gutter={16}>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title={t('extractionHints.quality.totalExtractions')}
              value={quality.totalExtractions}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title={t('extractionHints.quality.avgCorrectedFields')}
              value={quality.avgCorrectedFields}
              precision={2}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title={t('extractionHints.quality.correctionRate')}
              value={quality.correctionRate * 100}
              precision={1}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card size="small" title={t('extractionHints.quality.bySource')}>
            <Flex vertical gap={12}>
              {QUALITY_SOURCES.map((source) => {
                const count = quality.bySource[source] ?? 0;
                const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={source}>
                    <Flex justify="space-between" style={{ marginBottom: 4 }}>
                      <Tag>{t(`projects.documents.upload.extraction.source.${source}`)}</Tag>
                      <Text type="secondary">{count}</Text>
                    </Flex>
                    <Progress percent={percent} showInfo={false} size="small" />
                  </div>
                );
              })}
            </Flex>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card size="small" title={t('extractionHints.quality.byConfidence')}>
            <Flex vertical gap={12}>
              {QUALITY_CONFIDENCES.map((confidence) => {
                const count = quality.byConfidence[confidence] ?? 0;
                const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={confidence}>
                    <Flex justify="space-between" style={{ marginBottom: 4 }}>
                      <Tag color={CONFIDENCE_COLOR[confidence]}>
                        {t(`projects.documents.upload.extraction.confidence.${confidence}`)}
                      </Tag>
                      <Text type="secondary">{count}</Text>
                    </Flex>
                    <Progress
                      percent={percent}
                      showInfo={false}
                      size="small"
                      status={confidence === 'low' ? 'exception' : undefined}
                    />
                  </div>
                );
              })}
            </Flex>
          </Card>
        </Col>
      </Row>

      <Card size="small" title={t('extractionHints.quality.topHints')}>
        {quality.topHints.length === 0 ? (
          <Empty description={t('extractionHints.quality.topHintsEmpty')} />
        ) : (
          <Flex vertical gap={8}>
            {quality.topHints.map((hint, index) => (
              <Flex
                key={`${hint.issuerName}-${hint.field}-${index}`}
                align="center"
                gap={8}
                wrap
              >
                <Text strong>{hint.issuerName || t('extractionHints.unknownIssuer')}</Text>
                <Text type="secondary">·</Text>
                <Tag>{t(`projects.documents.upload.fields.${hint.field}`)}</Tag>
                <Text type="secondary">·</Text>
                <Text type="secondary">
                  {t('extractionHints.quality.occurrences', { count: hint.occurrences })}
                </Text>
              </Flex>
            ))}
          </Flex>
        )}
      </Card>
    </Flex>
  );
}

export function ExtractionHintsPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [hints, setHints] = useState<ExtractionHintDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadHints = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    listExtractionHints()
      .then(setHints)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadHints();
  }, [loadHints]);

  const groups = useMemo(() => groupByIssuer(hints), [hints]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteExtractionHint(id);
      void message.success(t('extractionHints.deleted'));
      loadHints();
    } catch {
      void message.error(t('extractionHints.deleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  const columns: TableColumnsType<ExtractionHintDto> = [
    {
      title: t('extractionHints.columns.field'),
      dataIndex: 'field',
      key: 'field',
      width: 160,
      render: (field: ExtractionHintDto['field']) => (
        <Tag>{t(`projects.documents.upload.fields.${field}`)}</Tag>
      ),
    },
    {
      title: t('extractionHints.columns.anchorLabel'),
      dataIndex: 'anchorLabel',
      key: 'anchorLabel',
      ellipsis: true,
    },
    {
      title: t('extractionHints.columns.anchorKind'),
      dataIndex: 'anchorKind',
      key: 'anchorKind',
      width: 150,
      render: (anchorKind: ExtractionHintDto['anchorKind']) => (
        <Tag color={anchorKind === 'inline' ? 'blue' : 'purple'}>
          {t(`extractionHints.anchorKinds.${anchorKind}`)}
        </Tag>
      ),
    },
    {
      title: t('extractionHints.columns.occurrences'),
      dataIndex: 'occurrences',
      key: 'occurrences',
      width: 120,
      align: 'right',
    },
    {
      title: t('extractionHints.columns.sampleValue'),
      dataIndex: 'sampleValue',
      key: 'sampleValue',
      ellipsis: true,
    },
    {
      title: t('extractionHints.columns.actions'),
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Popconfirm
          title={t('extractionHints.deleteConfirm.title')}
          description={t('extractionHints.deleteConfirm.content')}
          okText={t('extractionHints.deleteConfirm.ok')}
          cancelText={t('common.cancel')}
          okButtonProps={{ danger: true }}
          onConfirm={() => handleDelete(record.id)}
        >
          <Button
            danger
            type="text"
            icon={<DeleteOutlined />}
            loading={deletingId === record.id}
          />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '56px 64px' }}>
      <Title level={2} style={{ marginTop: 0, marginBottom: 6 }}>
        {t('extractionHints.title')}
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 36 }}>
        {t('extractionHints.subtitle')}
      </Text>

      <Tabs
        items={[
          {
            key: 'hints',
            label: t('extractionHints.tabs.hints'),
            children: loading ? (
              <Flex justify="center" style={{ padding: '48px 0' }}>
                <Spin />
              </Flex>
            ) : loadError ? (
              <Alert type="error" showIcon message={t('extractionHints.loadError')} />
            ) : groups.length === 0 ? (
              <Empty description={t('extractionHints.empty')} />
            ) : (
              <Collapse
                defaultActiveKey={groups.map((group) => group.issuerName)}
                items={groups.map((group) => ({
                  key: group.issuerName,
                  label: (
                    <Flex align="center" gap={8}>
                      <Text strong>
                        {group.issuerName || t('extractionHints.unknownIssuer')}
                      </Text>
                      <Tag>
                        {t(
                          group.hints.length === 1
                            ? 'extractionHints.hintCountOne'
                            : 'extractionHints.hintCountOther',
                          { count: group.hints.length },
                        )}
                      </Tag>
                    </Flex>
                  ),
                  children: (
                    <Table<ExtractionHintDto>
                      columns={columns}
                      dataSource={group.hints}
                      rowKey="id"
                      size="small"
                      pagination={false}
                    />
                  ),
                }))}
              />
            ),
          },
          {
            key: 'quality',
            label: t('extractionHints.tabs.quality'),
            children: <QualityPanel />,
          },
        ]}
      />
    </div>
  );
}
