import type { EquipmentDeletionOutcome, EquipmentDto } from '@/entities/equipment';

export function isEquipmentArchived(equipment: EquipmentDto): boolean {
  return equipment.archivedAt !== null && equipment.archivedAt !== undefined;
}

export function visibleEquipment(
  equipment: EquipmentDto[],
  showArchived: boolean,
): EquipmentDto[] {
  return showArchived ? equipment : equipment.filter((item) => !isEquipmentArchived(item));
}

export function equipmentDeletionMessageKey(outcome: EquipmentDeletionOutcome):
  | 'equipment.deleted'
  | 'equipment.archived' {
  return outcome === 'archived' ? 'equipment.archived' : 'equipment.deleted';
}
