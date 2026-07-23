import type { CSSProperties } from 'react';
import { theme, type ThemeConfig } from 'antd';

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const LAYOUT = {
  topbarHeight: 52,
  siderWidth: 220,
  siderCollapsedWidth: 64,
  sectionHeaderHeight: 56,
  pagePaddingBlock: 32,
  pagePaddingInline: 32,
  contentMaxWidth: 1440,
} as const;

export const BRAND_DEFAULT = '#00609c';

export interface SemanticPalette {
  income: string;
  expense: string;
  paid: string;
  pending: string;
  overdue: string;
  accentWarm: string;
  accentCool: string;
}

export const SEMANTIC_LIGHT: SemanticPalette = {
  income: '#2E7D5B',
  expense: '#C1633F',
  paid: '#2E7D5B',
  pending: '#C98A21',
  overdue: '#B3453D',
  accentWarm: '#C1633F',
  accentCool: '#6B5CA5',
};

export const SEMANTIC_DARK: SemanticPalette = {
  income: '#4CA57E',
  expense: '#E08A5E',
  paid: '#4CA57E',
  pending: '#E0A93E',
  overdue: '#E06B60',
  accentWarm: '#E08A5E',
  accentCool: '#8E7FC7',
};

export const CHART_SERIES_LIGHT: readonly string[] = [
  BRAND_DEFAULT,
  SEMANTIC_LIGHT.income,
  SEMANTIC_LIGHT.accentWarm,
  SEMANTIC_LIGHT.pending,
  SEMANTIC_LIGHT.accentCool,
  '#64748B',
];

export const CHART_SERIES_DARK: readonly string[] = [
  BRAND_DEFAULT,
  SEMANTIC_DARK.income,
  SEMANTIC_DARK.accentWarm,
  SEMANTIC_DARK.pending,
  SEMANTIC_DARK.accentCool,
  '#94A3B8',
];

export const PROJECT_COLOR_TOKENS = [
  'brand',
  'green',
  'terracotta',
  'amber',
  'violet',
  'slate',
  'teal',
  'rose',
  'indigo',
  'olive',
] as const;

export type ProjectColorToken = (typeof PROJECT_COLOR_TOKENS)[number];

export const PROJECT_PALETTE: Record<ProjectColorToken, { light: string; dark: string }> = {
  brand: { light: '#00609C', dark: '#4A9FD4' },
  green: { light: '#2E7D5B', dark: '#4CA57E' },
  terracotta: { light: '#C1633F', dark: '#E08A5E' },
  amber: { light: '#C98A21', dark: '#E0A93E' },
  violet: { light: '#6B5CA5', dark: '#8E7FC7' },
  slate: { light: '#64748B', dark: '#94A3B8' },
  teal: { light: '#0F766E', dark: '#3FBFAF' },
  rose: { light: '#A83E62', dark: '#D98099' },
  indigo: { light: '#3B5BA5', dark: '#7C97D9' },
  olive: { light: '#6B7A2E', dark: '#A3B356' },
};

export const TYPE: {
  kpiValue: CSSProperties;
  kpiValueSm: CSSProperties;
  kpiLabel: CSSProperties;
  cardTitle: CSSProperties;
  caption: CSSProperties;
  numeric: CSSProperties;
} = {
  kpiValue: { fontSize: 28, lineHeight: 1.15, fontWeight: 650, letterSpacing: '-0.01em' },
  kpiValueSm: { fontSize: 22, lineHeight: 1.15, fontWeight: 650, letterSpacing: '-0.01em' },
  kpiLabel: { fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' },
  cardTitle: { fontSize: 14, fontWeight: 600 },
  caption: { fontSize: 12, lineHeight: 1.4 },
  numeric: { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum" 1' },
};

const FONT_FAMILY =
  "'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export function buildThemeConfig(mode: 'light' | 'dark', brandColor?: string): ThemeConfig {
  const isDark = mode === 'dark';
  const primary = brandColor ?? BRAND_DEFAULT;

  const seedToken: ThemeConfig['token'] = {
    colorPrimary: primary,
    colorInfo: primary,
    colorLink: primary,
    colorSuccess: SEMANTIC_LIGHT.income,
    colorWarning: SEMANTIC_LIGHT.pending,
    colorError: SEMANTIC_LIGHT.overdue,
    fontFamily: FONT_FAMILY,
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    borderRadiusXS: 4,
    controlHeight: 36,
    boxShadow: isDark
      ? '0 1px 2px rgba(0, 0, 0, 0.32), 0 1px 3px rgba(0, 0, 0, 0.36)'
      : '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
    boxShadowSecondary: isDark
      ? '0 4px 10px rgba(0, 0, 0, 0.36), 0 2px 4px rgba(0, 0, 0, 0.28)'
      : '0 4px 10px rgba(16, 24, 40, 0.06), 0 2px 4px rgba(16, 24, 40, 0.04)',
    boxShadowTertiary: isDark
      ? '0 2px 4px rgba(0, 0, 0, 0.28)'
      : '0 2px 4px rgba(16, 24, 40, 0.04)',
    wireframe: false,
    ...(isDark ? { colorBorderSecondary: 'rgba(255, 255, 255, 0.16)' } : {}),
  };

  const algorithm = isDark ? theme.darkAlgorithm : theme.defaultAlgorithm;
  const derived = theme.getDesignToken({ token: seedToken, algorithm });

  return {
    algorithm,
    token: seedToken,
    components: {
      Table: {
        rowHoverBg: isDark ? 'rgba(255, 255, 255, 0.06)' : `${primary}0F`,
        headerBg: derived.colorFillTertiary,
        headerColor: derived.colorTextSecondary,
        cellPaddingBlock: 12,
        cellPaddingBlockSM: 8,
        borderColor: derived.colorBorderSecondary,
      },
      Card: {
        bodyPadding: SPACE.lg,
        bodyPaddingSM: SPACE.md,
        headerPadding: SPACE.lg,
        headerFontSize: 14,
        headerBg: 'transparent',
      },
      Tag: {
        defaultBg: derived.colorFillTertiary,
        defaultColor: derived.colorText,
      },
      Menu: {
        itemBorderRadius: 8,
        itemMarginInline: 8,
        itemHeight: 40,
      },
      Button: {
        primaryShadow: 'none',
        defaultShadow: 'none',
        dangerShadow: 'none',
      },
      Layout: {
        headerBg: derived.colorBgContainer,
        siderBg: derived.colorBgContainer,
        bodyBg: derived.colorBgLayout,
        triggerBg: primary,
        triggerColor: '#fff',
      },
      Segmented: {
        itemSelectedBg: derived.colorBgContainer,
        itemSelectedColor: primary,
      },
    },
  };
}
