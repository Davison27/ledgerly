import { Client } from '../../domain/client';

export class ClientResponse {
  id: string;
  name: string;
  taxId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  archivedAt?: string;

  static fromDomain(client: Client): ClientResponse {
    const response = new ClientResponse();
    const primitives = client.toPrimitives();
    response.id = primitives.id;
    response.name = primitives.name;
    response.taxId = primitives.taxId;
    response.contactName = primitives.contactName;
    response.contactEmail = primitives.contactEmail;
    response.contactPhone = primitives.contactPhone;
    if (primitives.archivedAt !== undefined && primitives.archivedAt !== null) response.archivedAt = primitives.archivedAt;
    return response;
  }
}
