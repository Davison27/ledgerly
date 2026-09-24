import { queryOptions } from '@tanstack/react-query';
import {
  getProjectChecklist,
  getProjectChecklistTemplate,
  listProjectChecklistTemplates,
} from './project-checklist.api';

export const projectChecklistQueries = {
  all: ['project-checklist'] as const,
  templates: () =>
    queryOptions({
      queryKey: [...projectChecklistQueries.all, 'templates'] as const,
      queryFn: listProjectChecklistTemplates,
    }),
  template: (id: string) =>
    queryOptions({
      queryKey: [...projectChecklistQueries.all, 'template', id] as const,
      queryFn: () => getProjectChecklistTemplate(id),
    }),
  project: (projectId: string) =>
    queryOptions({
      queryKey: [...projectChecklistQueries.all, 'project', projectId] as const,
      queryFn: () => getProjectChecklist(projectId),
    }),
};
