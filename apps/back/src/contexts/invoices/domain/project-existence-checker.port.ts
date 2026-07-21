export const PROJECT_EXISTENCE_CHECKER = Symbol('ProjectExistenceChecker');

export interface ProjectExistenceChecker {
  exists(projectId: string): Promise<boolean>;
}
