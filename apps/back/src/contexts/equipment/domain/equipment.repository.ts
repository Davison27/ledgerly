import { Equipment } from './equipment';

export const EQUIPMENT_REPOSITORY = Symbol('EquipmentRepository');

export interface EquipmentRepository {
  findAll(): Promise<Equipment[]>;
  findById(id: string): Promise<Equipment | null>;
  findByName(name: string): Promise<Equipment | null>;
  save(equipment: Equipment): Promise<void>;
  delete(id: string): Promise<void>;
}
