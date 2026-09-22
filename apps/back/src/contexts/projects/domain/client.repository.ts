import { Client } from './client';
import { ClientSummary } from './client-summary';

export const CLIENT_REPOSITORY = Symbol('ClientRepository');

export interface ClientRepository {
  findAll(): Promise<Client[]>;
  findAllSummaries(): Promise<ClientSummary[]>;
  findById(id: string): Promise<Client | null>;
  findByTaxId(taxId: string): Promise<Client | null>;
  save(client: Client): Promise<void>;
  archive(id: string): Promise<void>;
  unarchive?(id: string): Promise<void>;
  delete(id: string): Promise<void>;
}
