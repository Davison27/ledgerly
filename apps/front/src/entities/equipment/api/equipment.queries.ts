import { queryOptions } from '@tanstack/react-query';
import { listEquipment, listEquipmentDocuments } from './equipment.api';

export const equipmentQueries = {
  all: ['equipment'] as const,
  list: () =>
    queryOptions({
      queryKey: ['equipment', 'list'] as const,
      queryFn: listEquipment,
    }),
};

export const equipmentDocumentQueries = {
  all: ['equipment-documents'] as const,
  list: (equipmentId: string) =>
    queryOptions({
      queryKey: ['equipment-documents', equipmentId] as const,
      queryFn: () => listEquipmentDocuments(equipmentId),
    }),
};
