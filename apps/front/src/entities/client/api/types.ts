export interface ClientDto {
  id: string;
  name: string;
  taxId?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  archivedAt?: string | null;
}

export type ClientDeletionOutcome = 'deleted' | 'archived';

export interface ClientDeletionOutcomeDto {
  outcome: ClientDeletionOutcome;
}

export interface ClientUnarchiveOutcomeDto {
  outcome: 'unarchived';
}

export interface CreateClientPayload {
  name: string;
  taxId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface UpdateClientPayload {
  name?: string;
  taxId?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}
