import { Project } from './project';
import { ProjectSummary } from './project-summary';

export const PROJECT_REPOSITORY = Symbol('ProjectRepository');

export interface ProjectDashboardRow {
  id: string;
  name: string;
  budget: number | null;
  currency: string;
}

export interface ProjectRepository {
  findAllSummaries(): Promise<ProjectSummary[]>;
  findSummaryById(id: string): Promise<ProjectSummary | null>;
  findById(id: string): Promise<Project | null>;
  findByCode(code: string): Promise<Project | null>;
  save(project: Project): Promise<void>;
  delete(id: string): Promise<void>;
  findAllForDashboard(): Promise<ProjectDashboardRow[]>;
}
