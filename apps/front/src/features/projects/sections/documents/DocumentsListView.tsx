import { Table, Typography, type TableColumnsType } from 'antd';
import { useTranslation } from 'react-i18next';
import type { ProjectDocument } from '../../../../data/documents';
import { formatEUR, useTypeLabel } from './documentFormat';
import { StatusTag } from './documentUi';

const { Text } = Typography;

interface DocumentsListViewProps {
  documents: ProjectDocument[];
  selectedId: string | null;
  onSelect: (doc: ProjectDocument) => void;
  color: string;
}

export function DocumentsListView({
  documents,
  selectedId,
  onSelect,
  color,
}: DocumentsListViewProps) {
  const { t } = useTranslation();
  const typeLabel = useTypeLabel();

  const columns: TableColumnsType<ProjectDocument> = [
    {
      title: t('projects.documents.columns.document'),
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: t('projects.documents.columns.type'),
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (_, record) => typeLabel(record.type),
    },
    {
      title: t('projects.documents.columns.date'),
      dataIndex: 'date',
      key: 'date',
      width: 120,
    },
    {
      title: t('projects.documents.columns.amount'),
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (amount: number) => formatEUR(amount),
    },
    {
      title: t('projects.documents.columns.status'),
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (_, record) => <StatusTag status={record.status} />,
    },
  ];

  return (
    <Table<ProjectDocument>
      columns={columns}
      dataSource={documents}
      rowKey="id"
      size="small"
      pagination={false}
      sticky
      onRow={(record) => ({
        onClick: () => onSelect(record),
        style: {
          cursor: 'pointer',
          background: record.id === selectedId ? `${color}22` : undefined,
        },
      })}
    />
  );
}
