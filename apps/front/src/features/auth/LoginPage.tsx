import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { Button } from '../../components/ui/Button';
import logoUrl from '../../assets/ledgerly-logo.svg';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogin = () => {
    void navigate({ to: '/enterprises' });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#f4f6f8_0%,#e3e8ec_60%,#dbe1e6_100%)]">
      <div className="absolute top-6 right-6">
        <LanguageSwitcher />
      </div>

      <div className="flex w-[500px] animate-fade-in flex-col items-center gap-7 rounded-2xl bg-surface px-16 py-14 shadow-[0_20px_60px_rgba(20,40,60,0.14)]">
        <img
          src={logoUrl}
          alt={t('common.appName')}
          className="w-[190px] object-contain"
        />

        <div className="text-center">
          <div className="text-[13px] tracking-[0.04em] text-muted-2">
            {t('login.subtitle')}
          </div>
        </div>

        <Button variant="primary" size="lg" fullWidth onClick={handleLogin}>
          {t('login.signIn')}
        </Button>
      </div>
    </div>
  );
}
