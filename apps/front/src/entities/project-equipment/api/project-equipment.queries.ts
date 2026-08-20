import { queryOptions } from '@tanstack/react-query';
import { listProjectEquipment } from './project-equipment.api';

export const projectEquipmentQueries = {
  all: ['project-equipment'] as const,
  list: (projectId: string) => queryOptions({
    queryKey: [...projectEquipmentQueries.all, projectId],
    queryFn: () => listProjectEquipment(projectId),
  }),
};
