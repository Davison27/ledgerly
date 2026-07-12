import type { ReactNode } from 'react';
import { App as AntdApp, ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import enUS from 'antd/locale/en_US';
import { useTranslation } from 'react-i18next';

const localeMap = { es: esES, en: enUS } as const;

const brandTheme = {
  token: {
    colorPrimary: '#00609c',
    colorInfo: '#00609c',
    colorLink: '#00609c',
    colorTextSecondary: '#a0a1a2',
  },
} as const;

export function AppProviders({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const lng = (i18n.resolvedLanguage ?? 'es') as keyof typeof localeMap;

  return (
    <ConfigProvider locale={localeMap[lng]} theme={brandTheme}>
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}
