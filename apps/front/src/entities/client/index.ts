export {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  unarchiveClient,
} from './api/clients.api';
export type {
  ClientDeletionOutcome,
  ClientDeletionOutcomeDto,
  ClientDto,
  ClientSummaryDto,
  ClientUnarchiveOutcomeDto,
  CreateClientPayload,
  UpdateClientPayload,
} from './api/types';
export { clientQueries } from './api/client.queries';
export {
  addClient,
  fetchClient,
  fetchClients,
  isClientArchived,
  mapClient,
  removeClient,
  restoreClient,
  updateClient as updateClientModel,
  visibleClients,
  parentClientError,
} from './model/client';
export type { Client, ClientFormValues, ParentClientError } from './model/client';
