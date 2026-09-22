export interface ClientSummary {
  id: string;
  name: string;
  taxId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  archivedAt: string | null;
  projectCount: number;
}
