import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import i18n from '@/shared/i18n';
import { formatDate } from '@/shared/lib/dates';
import { releaseNotes } from '@/entities/release-note';
import { ChangelogPage } from './ChangelogPage';

describe('ChangelogPage', () => {
  afterEach(async () => {
    await i18n.changeLanguage('es');
  });

  it('renders registry order, localized release details, and only populated categories', async () => {
    await i18n.changeLanguage('en');
    render(<ChangelogPage />);

    const releaseHeadings = screen.getAllByRole('heading', { level: 3 });
    expect(releaseHeadings.map((heading) => heading.textContent)).toEqual(
      releaseNotes.releases.map((release) => release.version),
    );

    const release = screen.getByRole('article', { name: releaseNotes.releases[0].version });
    expect(screen.getByRole('heading', { name: 'Changelog', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Review the complete Ledgerly release history.')).toBeInTheDocument();
    expect(screen.getByText('Release history')).toBeInTheDocument();
    expect(
      screen.getByText('Review versioned Ledgerly changes and acknowledge each release once.'),
    ).toBeInTheDocument();
    expect(within(release).getByRole('heading', { name: 'Added', level: 4 })).toBeInTheDocument();
    expect(within(release).getByRole('heading', { name: 'Changed', level: 4 })).toBeInTheDocument();
    expect(within(release).getByRole('heading', { name: 'Security', level: 4 })).toBeInTheDocument();
    expect(within(release).queryByRole('heading', { name: 'Fixed', level: 4 })).not.toBeInTheDocument();
    expect(within(release).getByText(/^Released on /)).toHaveTextContent(
      formatDate(releaseNotes.releases[0].date, 'en'),
    );
  });

  it('uses Spanish release text and date formatting', async () => {
    await i18n.changeLanguage('es');
    render(<ChangelogPage />);

    expect(screen.getByRole('heading', { name: 'Registro de cambios', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Consulta el historial completo de versiones de Ledgerly.')).toBeInTheDocument();
    expect(screen.getByText('Historial de versiones')).toBeInTheDocument();
    expect(
      screen.getByText('Consulta los cambios versionados de Ledgerly y confirma cada versión una sola vez.'),
    ).toBeInTheDocument();
    const release = screen.getByRole('article', { name: releaseNotes.releases[0].version });
    expect(within(release).getByRole('heading', { name: 'Añadido', level: 4 })).toBeInTheDocument();
    expect(within(release).getByText(/^Publicado el /)).toHaveTextContent(
      formatDate(releaseNotes.releases[0].date, 'es'),
    );
  });
});
