import registry from '../config/release-notes.json';

export type ReleaseCategory = 'added' | 'changed' | 'fixed' | 'security';

export interface ReleaseEntry {
  id: string;
  category: ReleaseCategory;
}

export interface ReleaseRecord {
  version: string;
  date: string;
  entries: ReleaseEntry[];
}

export interface ReleaseNotesRegistry {
  currentVersion: string;
  releases: ReleaseRecord[];
}

export interface ReleaseCategoryGroup {
  category: ReleaseCategory;
  entries: ReleaseEntry[];
}

export const releaseCategories: ReleaseCategory[] = ['added', 'changed', 'fixed', 'security'];
export const releaseNotes = registry as ReleaseNotesRegistry;
export const currentReleaseVersion = releaseNotes.currentVersion;

export function getCategorizedReleaseEntries(entries: ReleaseEntry[]): ReleaseCategoryGroup[] {
  return releaseCategories.flatMap((category) => {
    const matchingEntries = entries.filter((entry) => entry.category === category);
    return matchingEntries.length > 0 ? [{ category, entries: matchingEntries }] : [];
  });
}
