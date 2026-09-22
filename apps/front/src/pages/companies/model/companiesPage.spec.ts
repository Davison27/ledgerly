import { describe, expect, it } from 'vitest';
import type { ClientSummaryDto } from '@/entities/client';
import {
  clientDeletionMessageKey,
  clientMutationErrorMessageKey,
  visibleCompanyClients,
} from './companiesPage';

const clients: ClientSummaryDto[] = [
  { id: 'client-1', name: 'Active client', archivedAt: null, projectCount: 2 },
  { id: 'client-2', name: 'Archived client', archivedAt: '2026-09-21T10:00:00.000Z', projectCount: 4 },
];

describe('companies page model', () => {
  it('hides archived clients until the directory asks for them', () => {
    expect(visibleCompanyClients(clients, false)).toEqual([clients[0]]);
    expect(visibleCompanyClients(clients, true)).toEqual(clients);
  });

  it('maps lifecycle outcomes to localized message keys', () => {
    expect(clientDeletionMessageKey('deleted')).toBe('companies.deleted');
    expect(clientDeletionMessageKey('archived')).toBe('companies.archived');
  });

  it('maps client form failures to operation-specific localized keys', () => {
    expect(clientMutationErrorMessageKey(new Error('failed'), 'create')).toBe(
      'companies.form.createError',
    );
    expect(clientMutationErrorMessageKey(new Error('failed'), 'update')).toBe(
      'companies.form.updateError',
    );
  });
});
