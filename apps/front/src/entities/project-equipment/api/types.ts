export interface ProjectEquipmentDto {
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

export interface SaveProjectEquipmentPayload {
  equipmentId: string;
  leaseExpense?: number | null;
  leaseExpenseDate?: string | null;
}
