import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/enterprises')({
  component: EnterprisesPage,
});

function EnterprisesPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-2xl font-bold text-ink-strong">
        {t('enterprises.placeholderTitle')}
      </h1>
      <p className="text-sm text-muted">{t('enterprises.placeholderBody')}</p>
    </div>
  );
}
