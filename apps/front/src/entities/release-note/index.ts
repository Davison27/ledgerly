export {
  currentReleaseVersion,
  getCategorizedReleaseEntries,
  releaseCategories,
  releaseNotes,
} from './model/releaseNotes';
export { acknowledgeReleaseNote, getReleaseNoteAcknowledgement } from './api/release-notes.api';
export { releaseNoteQueries } from './api/release-notes.queries';
export type {
  ReleaseCategory,
  ReleaseCategoryGroup,
  ReleaseEntry,
  ReleaseNotesRegistry,
  ReleaseRecord,
} from './model/releaseNotes';
export type { ReleaseNoteAcknowledgement } from './api/types';
