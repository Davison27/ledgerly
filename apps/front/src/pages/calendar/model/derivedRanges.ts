import type { SchedulableProjectDto } from '@/entities/schedule-event';

export const MAX_DERIVED_RANGE_DAYS = 366;

export class DerivedRangeTooLongError extends Error {}

export interface DerivedProjectRange {
  projectId: string;
  startDate: string;
  endDate: string;
}

export function deriveProjectRange(project: SchedulableProjectDto): DerivedProjectRange | null {
  if (project.status !== 'active' || project.hasEvents) return null;
  if (!project.startDate && !project.endDate) return null;

  const startDate = project.startDate ?? project.endDate!;
  const endDate = project.endDate ?? project.startDate!;

  return { projectId: project.id, startDate, endDate };
}

export function deriveProjectRanges(projects: SchedulableProjectDto[]): DerivedProjectRange[] {
  return projects.reduce<DerivedProjectRange[]>((ranges, project) => {
    const range = deriveProjectRange(project);
    return range ? [...ranges, range] : ranges;
  }, []);
}
