import { Segmented } from 'antd';
import { useTranslation } from 'react-i18next';
import { supportedLngs, type Language } from '../i18n';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage ?? 'es') as Language;

  return (
    <Segmented<Language>
      value={current}
      onChange={(lng) => void i18n.changeLanguage(lng)}
      options={supportedLngs.map((lng) => ({
        label: lng.toUpperCase(),
        value: lng,
      }))}
    />
  );
}
