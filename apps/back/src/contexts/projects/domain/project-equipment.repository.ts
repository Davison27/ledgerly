export const PROJECT_EQUIPMENT_REPOSITORY = Symbol('ProjectEquipmentRepository');

export interface ProjectEquipmentRecord {
  projectId: string;
  equipmentId: string;
  name: string;
  reference: string | null;
  category: string | null;
  image: string | null;
  leasingMonthlyFee: number | null;
  leaseExpenses: ProjectLeaseExpense[];
}

export interface ProjectLeaseExpense {
  id: string;
  amount: number;
  date: string;
}

export interface ProjectLeaseExpenseRow {
  projectId: string;
  amount: number;
  date: string;
}

export interface ProjectEquipmentRepository {
  findByProjectId(projectId: string): Promise<ProjectEquipmentRecord[]>;
  save(input: Pick<ProjectEquipmentRecord, 'projectId' | 'equipmentId'>): Promise<void>;
  addLeaseExpense(input: { projectId: string; equipmentId: string; amount: number; date: string }): Promise<void>;
  findLeaseExpensesByProject(projectId: string): Promise<Array<ProjectLeaseExpense & { equipmentId: string }>>;
  deleteLeaseExpense(id: string): Promise<boolean>;
  delete(projectId: string, equipmentId: string): Promise<boolean>;
  deleteByProjectId(projectId: string): Promise<void>;
  findAllLeaseExpenseRows(): Promise<ProjectLeaseExpenseRow[]>;
}
