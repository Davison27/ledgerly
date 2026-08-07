import { theme, type ThemeConfig } from 'antd';

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const LAYOUT = {
  topbarHeight: 60,
  siderWidth: 232,
  siderCollapsedWidth: 64,
  sectionHeaderHeight: 56,
  pagePaddingBlock: 24,
  pagePaddingInline: 32,
  contentMaxWidth: 1440,
} as const;

export const BREAKPOINT = { sm: 640, md: 768, lg: 960, xl: 1280 } as const;

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

export interface VividPalette {
  income: string;
  expense: string;
  pending: string;
  overdue: string;
  accentCool: string;
}

export const CHART_VIVID_LIGHT: VividPalette = {
  income: '#1C9A64',
  expense: '#D9663B',
  pending: '#DB9A1E',
  overdue: '#D6413A',
  accentCool: '#7A63C9',
};

export const CHART_VIVID_DARK: VividPalette = {
  income: '#3FCE8E',
  expense: '#F0955F',
  pending: '#F0C24C',
  overdue: '#F0685C',
  accentCool: '#A491E0',
};

export function chartAreaFill(color: string): string {
  return `linear-gradient(180deg, ${color}47 0%, ${color}00 100%)`;
}

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
    borderRadius: 10,
    borderRadiusLG: 16,
    borderRadiusSM: 8,
    borderRadiusXS: 4,
    controlHeight: 36,
    boxShadow: isDark
      ? '0 1px 2px rgba(0, 0, 0, 0.24), 0 1px 2px rgba(0, 0, 0, 0.28)'
      : '0 1px 2px rgba(16, 24, 40, 0.03), 0 1px 2px rgba(16, 24, 40, 0.04)',
    boxShadowSecondary: isDark
      ? '0 8px 20px rgba(0, 0, 0, 0.32), 0 2px 6px rgba(0, 0, 0, 0.24)'
      : '0 8px 20px rgba(16, 24, 40, 0.08), 0 2px 6px rgba(16, 24, 40, 0.04)',
    boxShadowTertiary: isDark
      ? '0 2px 4px rgba(0, 0, 0, 0.24)'
      : '0 2px 4px rgba(16, 24, 40, 0.03)',
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
        headerBg: derived.colorFillSecondary,
        headerColor: derived.colorTextSecondary,
        headerSplitColor: derived.colorBorderSecondary,
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
        borderRadiusLG: 16,
      },
      Tag: {
        defaultBg: derived.colorFillTertiary,
        defaultColor: derived.colorText,
      },
      Menu: {
        itemBorderRadius: 10,
        itemMarginInline: 8,
        itemHeight: 40,
        itemSelectedBg: isDark ? `${primary}29` : `${primary}14`,
        itemSelectedColor: primary,
        itemColor: derived.colorTextSecondary,
        itemHoverBg: isDark ? 'rgba(255, 255, 255, 0.06)' : derived.colorFillTertiary,
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
      Form: {
        itemMarginBottom: SPACE.md,
      },
    },
  };
}
