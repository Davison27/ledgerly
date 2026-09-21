export const EQUIPMENT_REFERENCE_COUNTER = Symbol('EquipmentReferenceCounter');

export interface EquipmentReferenceCounter {
  count(equipmentId: string): Promise<number>;
}
