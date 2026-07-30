export interface ProjectProductDto {
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

export interface SaveProjectProductPayload {
  productId: string;
  leaseExpense?: number | null;
  leaseExpenseDate?: string | null;
}
