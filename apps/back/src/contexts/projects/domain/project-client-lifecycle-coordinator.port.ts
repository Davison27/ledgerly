import { Project } from './project';

export const PROJECT_CLIENT_LIFECYCLE_COORDINATOR = Symbol('ProjectClientLifecycleCoordinator');

export interface ProjectClientLifecycleCoordinator {
  saveProjectForActiveClient(project: Project, checklistTemplateId?: string): Promise<void>;
  deleteOrArchiveClient(clientId: string): Promise<'deleted' | 'archived'>;
}
