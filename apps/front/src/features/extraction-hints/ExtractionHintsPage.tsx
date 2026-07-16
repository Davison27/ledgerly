import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App,
  Alert,
  Button,
  Collapse,
  Empty,
  Flex,
  Popconfirm,
  Spin,
  Table,
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
import type { ExtractionHintDto } from '../../data/api/types';

const { Title, Text } = Typography;

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

      {loading ? (
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
      )}
    </div>
  );
}
