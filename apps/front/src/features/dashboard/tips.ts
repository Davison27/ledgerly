import type { CompanyDashboardDto } from '../../data/api/types';

export type TipSeverity = 'info' | 'warning' | 'success';

export interface Tip {
  id: string;
  severity: TipSeverity;
  messageKey: string;
  values?: Record<string, string | number>;
}

const SEVERITY_ORDER: Record<TipSeverity, number> = {
  warning: 0,
  info: 1,
  success: 2,
};

/**
 * Pure, data-driven rules that turn the company dashboard snapshot into a
 * short list of actionable tips. Most severe (warning) first.
 */
export function deriveTips(data: CompanyDashboardDto): Tip[] {
  const tips: Tip[] = [];

  if (data.projectCount === 0) {
    tips.push({ id: 'noProjects', severity: 'info', messageKey: 'dashboard.tips.noProjects' });
  } else if (data.totalDocuments === 0) {
    tips.push({ id: 'noDocuments', severity: 'info', messageKey: 'dashboard.tips.noDocuments' });
  }

  if (data.overdueCount > 0) {
    tips.push({
      id: 'overdue',
      severity: 'warning',
      messageKey: 'dashboard.tips.overdue',
      values: { count: data.overdueCount },
    });
  }

  if (
    data.totalDocuments >= 5 &&
    data.pendingCount / data.totalDocuments > 0.4
  ) {
    tips.push({
      id: 'manyPending',
      severity: 'warning',
      messageKey: 'dashboard.tips.manyPending',
      values: { count: data.pendingCount },
    });
  }

  if (data.expenses > data.income && data.income > 0) {
    tips.push({
      id: 'expensesOverIncome',
      severity: 'warning',
      messageKey: 'dashboard.tips.expensesOverIncome',
    });
  }

  if (data.margin < 0) {
    tips.push({
      id: 'negativeMargin',
      severity: 'warning',
      messageKey: 'dashboard.tips.negativeMargin',
    });
  } else if (data.margin < 0.1 && data.income > 0) {
    tips.push({
      id: 'lowMargin',
      severity: 'info',
      messageKey: 'dashboard.tips.lowMargin',
    });
  }

  if (data.margin >= 0.2 && data.overdueCount === 0 && data.income > 0) {
    tips.push({ id: 'healthy', severity: 'success', messageKey: 'dashboard.tips.healthy' });
  }

  if (tips.length === 0) {
    tips.push({ id: 'generic', severity: 'info', messageKey: 'dashboard.tips.generic' });
  }

  return tips.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
