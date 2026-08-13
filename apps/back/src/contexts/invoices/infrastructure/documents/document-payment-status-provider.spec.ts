import { DataSource } from 'typeorm';
import { Clock } from '../../../../shared/domain/clock.port';
import { DocumentPaymentStatusProvider } from './document-payment-status-provider';

class FixedClock implements Clock {
  now(): Date {
    return new Date('2026-07-01T00:30:00.000Z');
  }

  todayIso(): string {
    return '2026-07-01';
  }
}

describe('DocumentPaymentStatusProvider', () => {
  it('uses the local calendar date from the clock', async () => {
    const query = jest.fn().mockResolvedValue([
      { documentId: 'document-1', status: 'vencido' },
    ]);
    const provider = new DocumentPaymentStatusProvider({ query } as unknown as DataSource, new FixedClock());

    const result = await provider.findByDocumentIds(['document-1']);

    expect(result).toEqual([{ documentId: 'document-1', status: 'vencido' }]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('due_date < $2'), [
      ['document-1'],
      '2026-07-01',
    ]);
  });

  it('does not query when there are no document ids', async () => {
    const query = jest.fn();
    const provider = new DocumentPaymentStatusProvider({ query } as unknown as DataSource, new FixedClock());

    await expect(provider.findByDocumentIds([])).resolves.toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });
});
