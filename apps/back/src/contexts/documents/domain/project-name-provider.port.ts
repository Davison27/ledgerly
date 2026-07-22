export const PROJECT_NAME_PROVIDER = Symbol('ProjectNameProvider');

export interface ProjectNameSummary {
  id: string;
  name: string;
}

export interface ProjectNameProvider {
  findAllNames(): Promise<ProjectNameSummary[]>;
}
