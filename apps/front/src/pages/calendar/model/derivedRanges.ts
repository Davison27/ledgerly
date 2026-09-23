import type { CalendarProjectOption } from './calendarEditorData';

export const MAX_DERIVED_RANGE_DAYS = 366;

export class DerivedRangeTooLongError extends Error {}

export interface DerivedProjectRange {
  projectId: string;
  startDate: string;
  endDate: string;
}

export function deriveProjectRange(project: CalendarProjectOption): DerivedProjectRange | null {
  if (project.status !== 'active' || project.hasEvents !== false) return null;
  if (!project.startDate && !project.endDate) return null;

  const startDate = project.startDate ?? project.endDate!;
  const endDate = project.endDate ?? project.startDate!;

  return { projectId: project.id, startDate, endDate };
}

export function deriveProjectRanges(projects: CalendarProjectOption[]): DerivedProjectRange[] {
  return projects.reduce<DerivedProjectRange[]>((ranges, project) => {
    const range = deriveProjectRange(project);
    return range ? [...ranges, range] : ranges;
  }, []);
}
