import { theme } from 'antd';
import { useThemeMode } from '../providers/ThemeModeProvider';
import {
  CHART_SERIES_DARK,
  CHART_SERIES_LIGHT,
  SEMANTIC_DARK,
  SEMANTIC_LIGHT,
  type SemanticPalette,
} from './tokens';

const { useToken } = theme;

export interface SemanticColors extends SemanticPalette {
  incomeBg: string;
  incomeBorder: string;
  expenseBg: string;
  expenseBorder: string;
  pendingBg: string;
  overdueBg: string;
  neutral: string;
  gridLine: string;
  chartSeries: readonly string[];
  mode: 'light' | 'dark';
}

function withOpacity(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function useSemanticColors(): SemanticColors {
  const { token } = useToken();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const palette = isDark ? SEMANTIC_DARK : SEMANTIC_LIGHT;
  const baseSeries = isDark ? CHART_SERIES_DARK : CHART_SERIES_LIGHT;

  return {
    ...palette,
    incomeBg: isDark ? withOpacity(SEMANTIC_DARK.income, 0.12) : token.colorSuccessBg,
    incomeBorder: isDark ? withOpacity(SEMANTIC_DARK.income, 0.4) : token.colorSuccessBorder,
    expenseBg: withOpacity(palette.expense, 0.12),
    expenseBorder: withOpacity(palette.expense, 0.4),
    pendingBg: isDark ? withOpacity(SEMANTIC_DARK.pending, 0.12) : token.colorWarningBg,
    overdueBg: isDark ? withOpacity(SEMANTIC_DARK.overdue, 0.12) : token.colorErrorBg,
    neutral: token.colorTextTertiary,
    gridLine: token.colorBorderSecondary,
    chartSeries: [token.colorPrimary, ...baseSeries.slice(1)],
    mode,
  };
}
