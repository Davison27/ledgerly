import { Card, Flex, Typography } from 'antd';
import type { ProjectDocument } from '../../../../data/documents';
import { formatEUR, useTypeLabel } from './documentFormat';
import { StatusTag } from './documentUi';

const { Text } = Typography;

interface DocumentsCardsViewProps {
  documents: ProjectDocument[];
  selectedId: string | null;
  onSelect: (doc: ProjectDocument) => void;
  color: string;
}

export function DocumentsCardsView({
  documents,
  selectedId,
  onSelect,
  color,
}: DocumentsCardsViewProps) {
  const typeLabel = useTypeLabel();

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
        gap: 12,
      }}
    >
      {documents.map((doc) => {
        const selected = doc.id === selectedId;
        return (
          <Card
            key={doc.id}
            size="small"
            hoverable
            onClick={() => onSelect(doc)}
            style={{
              borderColor: selected ? color : undefined,
              background: selected ? `${color}14` : undefined,
            }}
            styles={{ body: { padding: 12 } }}
          >
            <Flex vertical gap={6}>
              <Text strong ellipsis={{ tooltip: doc.name }}>
                {doc.name}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {typeLabel(doc.type)} · {doc.date}
              </Text>
              <Flex align="center" justify="space-between" gap={8}>
                <Text strong>{formatEUR(doc.amount)}</Text>
                <StatusTag status={doc.status} />
              </Flex>
            </Flex>
          </Card>
        );
      })}
    </div>
  );
}
