import { ProjectFinancialsRow } from './project-financials';

export const PROJECT_FINANCIALS_PROVIDER = Symbol('ProjectFinancialsProvider');

export interface ProjectFinancialsProvider {
  findAll(): Promise<ProjectFinancialsRow[]>;
}
