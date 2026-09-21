import { del, get, patch, post } from '@/shared/api/httpClient';
import { stripEmpty } from '@/shared/api/sanitize';
import type {
  ClientDeletionOutcomeDto,
  ClientDto,
  ClientUnarchiveOutcomeDto,
  CreateClientPayload,
  UpdateClientPayload,
} from './types';

export function listClients(): Promise<ClientDto[]> {
  return get<ClientDto[]>('/clients');
}

export function getClient(clientId: string): Promise<ClientDto> {
  return get<ClientDto>(`/clients/${clientId}`);
}

export function createClient(payload: CreateClientPayload): Promise<ClientDto> {
  return post<ClientDto>('/clients', stripEmpty(payload));
}

export function updateClient(clientId: string, payload: UpdateClientPayload): Promise<ClientDto> {
  return patch<ClientDto>(`/clients/${clientId}`, stripEmpty(payload, { preserveNull: true }));
}

export function deleteClient(clientId: string): Promise<ClientDeletionOutcomeDto> {
  return del<ClientDeletionOutcomeDto>(`/clients/${clientId}`);
}

export function unarchiveClient(clientId: string): Promise<ClientUnarchiveOutcomeDto> {
  return post<ClientUnarchiveOutcomeDto>(`/clients/${clientId}/unarchive`);
}
