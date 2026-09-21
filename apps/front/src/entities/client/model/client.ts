import type {
  ClientDeletionOutcome,
  ClientDto,
  ClientUnarchiveOutcomeDto,
  CreateClientPayload,
  UpdateClientPayload,
} from '../api/types';
import {
  createClient as createClientRequest,
  deleteClient as deleteClientRequest,
  getClient,
  listClients,
  unarchiveClient as unarchiveClientRequest,
  updateClient as updateClientRequest,
} from '../api/clients.api';

export interface Client {
  id: string;
  name: string;
  taxId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  archivedAt: string | null;
}

export type ClientFormValues = CreateClientPayload;

export function mapClient(dto: ClientDto): Client {
  return {
    id: dto.id,
    name: dto.name,
    taxId: dto.taxId ?? undefined,
    contactName: dto.contactName ?? undefined,
    contactEmail: dto.contactEmail ?? undefined,
    contactPhone: dto.contactPhone ?? undefined,
    archivedAt: dto.archivedAt ?? null,
  };
}

export function isClientArchived(client: ClientDto | Client): boolean {
  return client.archivedAt !== null && client.archivedAt !== undefined;
}

export function visibleClients<T extends ClientDto | Client>(
  clients: T[],
  showArchived: boolean,
): T[] {
  return showArchived ? clients : clients.filter((client) => !isClientArchived(client));
}

export async function fetchClients(): Promise<Client[]> {
  return (await listClients()).map(mapClient);
}

export async function fetchClient(clientId: string): Promise<Client> {
  return mapClient(await getClient(clientId));
}

export async function addClient(values: ClientFormValues): Promise<Client> {
  return mapClient(await createClientRequest(values));
}

export async function updateClient(clientId: string, values: UpdateClientPayload): Promise<Client> {
  return mapClient(await updateClientRequest(clientId, values));
}

export async function removeClient(clientId: string): Promise<ClientDeletionOutcome> {
  return (await deleteClientRequest(clientId)).outcome;
}

export async function restoreClient(clientId: string): Promise<ClientUnarchiveOutcomeDto['outcome']> {
  return (await unarchiveClientRequest(clientId)).outcome;
}
