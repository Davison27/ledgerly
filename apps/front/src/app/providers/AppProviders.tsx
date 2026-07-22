import type { ReactNode } from 'react';
import { App as AntdApp, ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import enUS from 'antd/locale/en_US';
import { useTranslation } from 'react-i18next';
import { buildThemeConfig } from '@/shared/config/theme';
import { BrandColorProvider, useBrandColor } from './BrandColorProvider';
import { ThemeModeProvider, useThemeMode } from './ThemeModeProvider';

const localeMap = { es: esES, en: enUS } as const;

function ThemedConfigProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const { mode } = useThemeMode();
  const { brandColor } = useBrandColor();
  const lng = (i18n.resolvedLanguage ?? 'es') as keyof typeof localeMap;

  return (
    <ConfigProvider locale={localeMap[lng]} theme={buildThemeConfig(mode, brandColor)}>
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <BrandColorProvider>
      <ThemeModeProvider>
        <ThemedConfigProvider>{children}</ThemedConfigProvider>
      </ThemeModeProvider>
    </BrandColorProvider>
  );
}
