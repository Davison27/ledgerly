import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import { companyQueries } from '@/entities/company';
import { useThemeMode } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { useLoginPage } from '../../model/useLoginPage';
import { LoginPage } from './LoginPage';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@/entities/company', () => ({
  companyQueries: { branding: vi.fn() },
}));

vi.mock('@/shared/lib/theme-mode/ThemeModeProvider', () => ({
  useThemeMode: vi.fn(),
}));

vi.mock('../../model/useLoginPage', () => ({
  useLoginPage: vi.fn(),
}));

vi.mock('../language/LanguageSwitcher', () => ({
  LanguageSwitcher: () => null,
}));

vi.mock('../productTour/ProductTour', () => ({
  ProductTour: () => null,
}));

describe('LoginPage', () => {
  const handleBootstrapSubmit = vi.fn();
  const handleSignIn = vi.fn();
  const toggle = vi.fn();

  beforeEach(() => {
    vi.mocked(companyQueries.branding).mockReturnValue({
      queryKey: ['company', 'branding'],
    } as never);
    vi.mocked(useQuery).mockReturnValue({
      data: { name: 'Acme Studio', logo: null, brandColor: '#123456' },
    } as never);
    vi.mocked(useThemeMode).mockReturnValue({ mode: 'light', toggle, setMode: vi.fn() });
    vi.mocked(useLoginPage).mockReturnValue({
      status: 'signIn',
      authError: undefined,
      sessionNotice: undefined,
      bootstrapSubmitting: false,
      bootstrapError: undefined,
      handleBootstrapSubmit,
      signInSubmitting: false,
      handleSignIn,
    });
  });

  it('renders the workspace name and starts Google sign-in', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: 'Accede a Acme Studio' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Continuar con Google/i }));

    expect(handleSignIn).toHaveBeenCalledTimes(1);
  });

  it('submits the bootstrap email only after the form is valid', async () => {
    const user = userEvent.setup();
    vi.mocked(useLoginPage).mockReturnValue({
      status: 'bootstrap',
      authError: undefined,
      sessionNotice: undefined,
      bootstrapSubmitting: false,
      bootstrapError: undefined,
      handleBootstrapSubmit,
      signInSubmitting: false,
      handleSignIn,
    });
    render(<LoginPage />);

    const submit = screen.getByRole('button', { name: 'Continuar con Google' });
    await user.click(submit);
    expect(handleBootstrapSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Correo de Google'), 'admin@acme.test');
    await user.click(submit);

    expect(handleBootstrapSubmit).toHaveBeenCalledWith('admin@acme.test');
  });

  it('shows authentication and session notices and forwards theme toggling', () => {
    vi.mocked(useLoginPage).mockReturnValue({
      status: 'signIn',
      authError: 'accessDenied',
      sessionNotice: 'expired',
      bootstrapSubmitting: false,
      bootstrapError: undefined,
      handleBootstrapSubmit,
      signInSubmitting: false,
      handleSignIn,
    });
    render(<LoginPage />);

    expect(screen.getAllByRole('alert')[0]).toHaveTextContent(
      'No se ha podido iniciar sesión con esa cuenta',
    );
    expect(screen.getByText('Tu sesión ha caducado. Vuelve a iniciar sesión.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar entre modo claro y oscuro' }));

    expect(toggle).toHaveBeenCalledTimes(1);
  });
});
