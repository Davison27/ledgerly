import { Card, Flex, Typography } from 'antd';
import {
  formatEUR,
  useTypeLabel,
  StatusTag,
  type ProjectDocument,
} from '@/entities/document';
import typography from '@/shared/ui/typography.module.css';
import styles from './DocumentsCardsView.module.css';

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
    <div className={styles.grid}>
      {documents.map((doc) => {
        const selected = doc.id === selectedId;
        return (
          <Card
            key={doc.id}
            size="small"
            hoverable
            onClick={() => onSelect(doc)}
            className={styles.card}
            data-selected={selected}
            style={selected ? { borderColor: color } : undefined}
            classNames={{ body: styles.body }}
          >
            <Flex vertical gap={6}>
              <Text strong ellipsis={{ tooltip: doc.name }}>
                {doc.name}
              </Text>
              <Text type="secondary" className={typography.caption}>
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
