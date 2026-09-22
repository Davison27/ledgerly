import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/api/httpClient';
import { isClientArchived, mapClient, parentClientError, visibleClients } from './client';

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

  it('maps the project count included in a client summary', () => {
    expect(mapClient({ ...clients[0], projectCount: 3 })).toMatchObject({ projectCount: 3 });
  });

  it.each([
    [400, 'INVALID_VALUE', 'required'],
    [404, 'ENTITY_NOT_FOUND', 'unavailable'],
    [409, 'CLIENT_ARCHIVED', 'archived'],
  ] as const)('maps %s/%s to the stable parent error kind', (status, code, expected) => {
    expect(parentClientError(new ApiError(status, { code }))).toBe(expected);
  });

  it('ignores unrelated API errors in the parent mapping', () => {
    expect(parentClientError(new ApiError(409, { code: 'OTHER_CONFLICT' }))).toBeNull();
    expect(parentClientError(new Error('network'))).toBeNull();
  });
});
