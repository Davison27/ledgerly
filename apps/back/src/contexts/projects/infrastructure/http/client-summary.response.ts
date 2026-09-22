import { ClientSummary } from '../../domain/client-summary';

export class ClientSummaryResponse {
  id: string;
  name: string;
  taxId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  archivedAt?: string;
  projectCount: number;

  static fromSummary(summary: ClientSummary): ClientSummaryResponse {
    const response = new ClientSummaryResponse();
    response.id = summary.id;
    response.name = summary.name;
    response.taxId = summary.taxId;
    response.contactName = summary.contactName;
    response.contactEmail = summary.contactEmail;
    response.contactPhone = summary.contactPhone;
    if (summary.archivedAt !== null) response.archivedAt = summary.archivedAt;
    response.projectCount = summary.projectCount;
    return response;
  }
}
