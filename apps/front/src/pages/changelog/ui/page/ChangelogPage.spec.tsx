import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import i18n from '@/shared/i18n';
import { formatDate } from '@/shared/lib/dates';
import {
  currentReleaseVersion,
  getCategorizedReleaseEntries,
  releaseNotes,
} from '@/entities/release-note';
import { ChangelogPage } from './ChangelogPage';

function getCurrentRelease() {
  const release = releaseNotes.releases.find(({ version }) => version === currentReleaseVersion);
  if (!release) throw new Error('Current release is missing from the registry');
  return release;
}

function getLocalizedCurrentReleaseCategories() {
  return getCategorizedReleaseEntries(getCurrentRelease().entries).map(({ category }) =>
    i18n.t(`releaseNotes.categories.${category}`),
  );
}

function getLocalizedCurrentReleaseEntryTitles() {
  const versionKey = currentReleaseVersion.replaceAll('.', '_');
  return getCurrentRelease().entries.map(({ id }) =>
    i18n.t(`releaseNotes.releases.v${versionKey}.entries.${id}.title`),
  );
}

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

    const currentRelease = getCurrentRelease();
    const release = screen.getByRole('article', { name: currentRelease.version });
    expect(screen.getByRole('heading', { name: 'Changelog', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Review the complete Ledgerly release history.')).toBeInTheDocument();
    expect(screen.getByText('Release history')).toBeInTheDocument();
    expect(
      screen.getByText('Review versioned Ledgerly changes and acknowledge each release once.'),
    ).toBeInTheDocument();
    expect(
      within(release).getAllByRole('heading', { level: 4 }).map((heading) => heading.textContent),
    ).toEqual(getLocalizedCurrentReleaseCategories());
    expect(within(release).getByText(/^Released on /)).toHaveTextContent(
      formatDate(currentRelease.date, 'en'),
    );
    for (const title of getLocalizedCurrentReleaseEntryTitles()) {
      expect(within(release).getByText(title)).toBeInTheDocument();
    }
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
    const currentRelease = getCurrentRelease();
    const release = screen.getByRole('article', { name: currentRelease.version });
    expect(
      within(release).getAllByRole('heading', { level: 4 }).map((heading) => heading.textContent),
    ).toEqual(getLocalizedCurrentReleaseCategories());
    expect(within(release).getByText(/^Publicado el /)).toHaveTextContent(
      formatDate(currentRelease.date, 'es'),
    );
    for (const title of getLocalizedCurrentReleaseEntryTitles()) {
      expect(within(release).getByText(title)).toBeInTheDocument();
    }
  });
});
