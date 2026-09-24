import { Progress, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { Project } from '@/entities/project';
import { Numeric } from '@/shared/ui/Numeric';
import styles from './ChecklistProgressSummary.module.css';

const { Text } = Typography;

interface ChecklistProgressSummaryProps {
  project: Project;
  standalone?: boolean;
}

export function ChecklistProgressSummary({
  project,
  standalone = false,
}: ChecklistProgressSummaryProps) {
  const { t } = useTranslation();
  const completed = project.checklistCompletedCount ?? 0;
  const total = project.checklistTotalCount ?? 0;
  const percent = total > 0 ? Math.min(100, (completed / total) * 100) : 0;
  const progressLabel = t('projects.planning.progress', { completed, total });
  const cell = (
    <div className={styles.cell}>
      <Text type="secondary" className={styles.label}>{t('projects.planning.title')}</Text>
      <div className={styles.value}>
        <div className={styles.progressSummary}>
          <span
            className={styles.progressTrack}
          >
            <Progress
              percent={percent}
              showInfo={false}
              size="small"
              className={styles.progressBar}
              aria-label={progressLabel}
            />
          </span>
          <Numeric>{progressLabel}</Numeric>
        </div>
      </div>
    </div>
  );

  return standalone ? <div className={styles.standalone}>{cell}</div> : cell;
}
