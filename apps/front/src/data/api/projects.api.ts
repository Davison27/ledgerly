import { get } from './httpClient';
import type { ProjectSummaryDto } from './types';

export function listProjects(): Promise<ProjectSummaryDto[]> {
  return get<ProjectSummaryDto[]>('/projects');
}
