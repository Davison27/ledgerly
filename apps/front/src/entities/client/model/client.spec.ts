import { describe, expect, it } from 'vitest';
import { isClientArchived, visibleClients } from './client';

const clients = [
  { id: 'client-1', name: 'Active client', archivedAt: null },
  { id: 'client-2', name: 'Archived client', archivedAt: '2026-09-21T10:00:00.000Z' },
];

describe('client view model', () => {
  it('hides archived clients by default and reveals them on request', () => {
    expect(visibleClients(clients, false)).toEqual([clients[0]]);
    expect(visibleClients(clients, true)).toEqual(clients);
    expect(isClientArchived(clients[1])).toBe(true);
  });
});
