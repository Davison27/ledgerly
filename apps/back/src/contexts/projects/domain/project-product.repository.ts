export const PROJECT_PRODUCT_REPOSITORY = Symbol('ProjectProductRepository');

export interface ProjectProductRecord {
  projectId: string;
  productId: string;
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

export interface ProjectProductRepository {
  findByProjectId(projectId: string): Promise<ProjectProductRecord[]>;
  save(input: Pick<ProjectProductRecord, 'projectId' | 'productId' | 'leaseExpense' | 'leaseExpenseDate'>): Promise<void>;
  delete(projectId: string, productId: string): Promise<boolean>;
  deleteByProjectId(projectId: string): Promise<void>;
  findAllLeaseExpenseRows(): Promise<ProjectLeaseExpenseRow[]>;
}
