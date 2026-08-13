import { SupplierSummary } from '../../domain/supplier-summary';

export class SupplierSummaryResponse {
  id: string;
  name: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  iban: string | null;
  notes: string | null;
  documentCount: number;
  spend: SupplierSummary['spend'];

  static fromSummary(summary: SupplierSummary): SupplierSummaryResponse {
    const response = new SupplierSummaryResponse();

    response.id = summary.id;
    response.name = summary.name;
    response.taxId = summary.taxId;
    response.email = summary.email;
    response.phone = summary.phone;
    response.address = summary.address;
    response.iban = summary.iban;
    response.notes = summary.notes;
    response.documentCount = summary.documentCount;
    response.spend = summary.spend;

    return response;
  }
}
