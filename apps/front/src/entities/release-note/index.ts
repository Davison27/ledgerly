import registry from './config/release-notes.json';

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

export const releaseNotes = registry as ReleaseNotesRegistry;
export const currentReleaseVersion = releaseNotes.currentVersion;
