export interface ProjectLeaseExpenseDto {
  id: string;
  amount: number;
  date: string;
}

export interface ProjectEquipmentDto {
  projectId: string;
  equipmentId: string;
  name: string;
  reference: string | null;
  category: string | null;
  image: string | null;
  leasingMonthlyFee: number | null;
  leaseExpenses: ProjectLeaseExpenseDto[];
}

export interface SaveProjectEquipmentPayload {
  equipmentId: string;
  leaseExpense?: number | null;
  leaseExpenseDate?: string | null;
}
