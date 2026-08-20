export const PROJECT_EQUIPMENT_REPOSITORY = Symbol('ProjectEquipmentRepository');

export interface ProjectEquipmentRecord {
  projectId: string;
  equipmentId: string;
  name: string;
  reference: string | null;
  category: string | null;
  image: string | null;
  leasingMonthlyFee: number | null;
  leaseExpense: number | null;
  leaseExpenseDate: string | null;
}

export interface ProjectLeaseExpenseRow {
  projectId: string;
  amount: number;
  date: string;
}

export interface ProjectEquipmentRepository {
  findByProjectId(projectId: string): Promise<ProjectEquipmentRecord[]>;
  save(input: Pick<ProjectEquipmentRecord, 'projectId' | 'equipmentId' | 'leaseExpense' | 'leaseExpenseDate'>): Promise<void>;
  delete(projectId: string, equipmentId: string): Promise<boolean>;
  deleteByProjectId(projectId: string): Promise<void>;
  findAllLeaseExpenseRows(): Promise<ProjectLeaseExpenseRow[]>;
}
