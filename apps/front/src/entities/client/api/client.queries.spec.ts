import { describe, expect, it, vi } from 'vitest';
import { getClient, listClients } from './clients.api';
import { clientQueries } from './client.queries';

vi.mock('./clients.api', () => ({
  getClient: vi.fn(),
  listClients: vi.fn(),
}));

describe('client query factories', () => {
  it('keeps the directory list and client detail keys separate', () => {
    expect(clientQueries.list().queryKey).toEqual(['clients', 'list']);
    expect(clientQueries.detail('client-1').queryKey).toEqual(['clients', 'detail', 'client-1']);
  });

  it('binds each factory to the corresponding API request', async () => {
    vi.mocked(listClients).mockResolvedValue([]);
    vi.mocked(getClient).mockResolvedValue({ id: 'client-1', name: 'Acme', archivedAt: null });

    await expect(clientQueries.list().queryFn!({} as never)).resolves.toEqual([]);
    await expect(clientQueries.detail('client-1').queryFn!({} as never)).resolves.toMatchObject({
      id: 'client-1',
    });
    expect(listClients).toHaveBeenCalledOnce();
    expect(getClient).toHaveBeenCalledWith('client-1');
  });
});
