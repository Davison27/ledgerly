import type { ReactNode } from 'react';
import { App as AntdApp, ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import enUS from 'antd/locale/en_US';
import { useTranslation } from 'react-i18next';
import { buildThemeConfig } from '../theme/tokens';
import { ThemeModeProvider, useThemeMode } from './ThemeModeProvider';

const localeMap = { es: esES, en: enUS } as const;

function ThemedConfigProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const { mode } = useThemeMode();
  const lng = (i18n.resolvedLanguage ?? 'es') as keyof typeof localeMap;

  return (
    <ConfigProvider locale={localeMap[lng]} theme={buildThemeConfig(mode)}>
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeModeProvider>
      <ThemedConfigProvider>{children}</ThemedConfigProvider>
    </ThemeModeProvider>
  );
}
