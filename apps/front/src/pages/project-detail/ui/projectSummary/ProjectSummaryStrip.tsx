import type { ReactNode } from 'react';
import { Skeleton, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { Project, ProjectStatus } from '@/entities/project';
import { formatDateRange } from '@/shared/lib/dates';
import { Amount } from '@/shared/ui/Amount';
import { Numeric } from '@/shared/ui/Numeric';
import { SemanticTag, type SemanticTone } from '@/shared/ui/SemanticTag';
import type { DashboardData } from '@/widgets/dashboard-charts';
import styles from './ProjectSummaryStrip.module.css';

const { Text } = Typography;

const STATUS_TONES: Record<ProjectStatus, SemanticTone> = {
  active: 'info',
  on_hold: 'pending',
  completed: 'paid',
  archived: 'neutral',
};

interface ProjectSummaryStripProps {
  project: Project;
  data: DashboardData;
  isFinancialsPending: boolean;
  isFinancialsError: boolean;
}

export function ProjectSummaryStrip({
  project,
  data,
  isFinancialsPending,
  isFinancialsError,
}: ProjectSummaryStripProps) {
  const { t, i18n } = useTranslation();
  const currency = project.currency ?? 'EUR';
  const dates = project.startDate && project.endDate
    ? formatDateRange(project.startDate, project.endDate, i18n.language)
    : '—';
  const margin = new Intl.NumberFormat(i18n.language, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(data.margin);

  return (
    <div className={styles.strip}>
      <SummaryCell label={t('projects.form.fields.status')}>
        {project.status ? (
          <SemanticTag tone={STATUS_TONES[project.status]}>
            {t(`projects.form.statuses.${project.status}`)}
          </SemanticTag>
        ) : (
          '—'
        )}
      </SummaryCell>
      <SummaryCell label={t('projects.form.fields.budget')}>
        {project.budget === undefined ? '—' : <Amount value={project.budget} currency={currency} strong />}
      </SummaryCell>
      <SummaryCell label={t('projects.summary.totalSpend')}>
        <FinancialValue isPending={isFinancialsPending} isError={isFinancialsError}>
          <Amount value={data.expenses} currency={currency} tone="expense" strong />
        </FinancialValue>
      </SummaryCell>
      <SummaryCell label={t('projects.summary.margin')}>
        <FinancialValue isPending={isFinancialsPending} isError={isFinancialsError}>
          <Numeric>{margin}</Numeric>
        </FinancialValue>
      </SummaryCell>
      <SummaryCell label={t('projects.summary.dates')}>
        <Numeric>{dates}</Numeric>
      </SummaryCell>
    </div>
  );
}

function SummaryCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.cell}>
      <Text type="secondary" className={styles.label}>{label}</Text>
      <div className={styles.value}>{children}</div>
    </div>
  );
}

function FinancialValue({
  isPending,
  isError,
  children,
}: {
  isPending: boolean;
  isError: boolean;
  children: ReactNode;
}) {
  if (isError) return '—';
  if (isPending) return <Skeleton.Input active size="small" className={styles.skeleton} />;
  return children;
}
