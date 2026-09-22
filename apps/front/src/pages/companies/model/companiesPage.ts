import type { ClientDeletionOutcome, ClientSummaryDto } from '@/entities/client';
import { ApiError } from '@/shared/api/httpClient';

export function isCompanyArchived(client: ClientSummaryDto): boolean {
  return client.archivedAt !== null && client.archivedAt !== undefined;
}

export function visibleCompanyClients(
  clients: ClientSummaryDto[],
  showArchived: boolean,
): ClientSummaryDto[] {
  return showArchived ? clients : clients.filter((client) => !isCompanyArchived(client));
}

export function clientDeletionMessageKey(
  outcome: ClientDeletionOutcome,
): 'companies.deleted' | 'companies.archived' {
  return outcome === 'archived' ? 'companies.archived' : 'companies.deleted';
}

export function clientMutationErrorMessageKey(
  error: unknown,
  operation: 'create' | 'update',
): 'companies.form.duplicateTaxId' | 'companies.unavailable' | 'companies.form.createError' | 'companies.form.updateError' {
  if (error instanceof ApiError && error.status === 409) {
    return 'companies.form.duplicateTaxId';
  }
  if (error instanceof ApiError && error.status === 404) {
    return 'companies.unavailable';
  }
  return operation === 'create' ? 'companies.form.createError' : 'companies.form.updateError';
}
