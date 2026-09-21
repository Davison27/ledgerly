export interface UpdateClientCommand {
  id: string;
  name?: string;
  taxId?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}
