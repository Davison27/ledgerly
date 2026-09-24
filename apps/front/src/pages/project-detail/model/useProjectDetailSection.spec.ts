import { describe, expect, it } from 'vitest';
import { getAllowedProjectDetailSections } from './useProjectDetailSection';

const access = {
  projects: true,
  documents: true,
  equipment: true,
  dashboard: true,
  calendar: true,
  planning: true,
};

describe('getAllowedProjectDetailSections', () => {
  it('shows Checklist only when planning is enabled and visible', () => {
    expect(getAllowedProjectDetailSections(access, true)).toContain('checklist');
    expect(getAllowedProjectDetailSections(access, false)).not.toContain('checklist');
    expect(getAllowedProjectDetailSections({ ...access, planning: false }, true)).not.toContain('checklist');
  });
});
