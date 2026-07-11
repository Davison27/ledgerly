import { useTranslation } from 'react-i18next';
import { supportedLngs, type Language } from '../i18n';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? 'es') as Language;

  return (
    <div
      className="inline-flex overflow-hidden rounded-lg border border-black/10 bg-white/70 backdrop-blur"
      role="group"
      aria-label={t('common.language')}
    >
      {supportedLngs.map((lng) => {
        const active = lng === current;
        return (
          <button
            key={lng}
            type="button"
            onClick={() => void i18n.changeLanguage(lng)}
            aria-pressed={active}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
              active
                ? 'bg-brand text-white'
                : 'text-muted hover:bg-black/[0.04]'
            }`}
          >
            {lng}
          </button>
        );
      })}
    </div>
  );
}
