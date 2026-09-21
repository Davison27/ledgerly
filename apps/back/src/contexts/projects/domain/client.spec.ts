import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';
import { Client } from './client';

describe('Client', () => {
  it('creates and exposes contact details', () => {
    const client = Client.create({
      id: 'client-1',
      name: 'Acme SL',
      taxId: 'B12345678',
      contactName: 'Ada Lovelace',
      contactEmail: 'ada@example.com',
      contactPhone: '+34 600 000 000',
    });

    expect(client.toPrimitives()).toEqual({
      id: 'client-1',
      name: 'Acme SL',
      taxId: 'B12345678',
      contactName: 'Ada Lovelace',
      contactEmail: 'ada@example.com',
      contactPhone: '+34 600 000 000',
    });
  });

  it('rejects invalid contact email values', () => {
    expect(() => Client.create({
      id: 'client-1',
      name: 'Acme SL',
      taxId: null,
      contactName: null,
      contactEmail: 'invalid',
      contactPhone: null,
    })).toThrow(InvalidValueException);
  });

  it('canonicalizes tax IDs at the aggregate boundary', () => {
    const client = Client.create({
      id: 'client-1',
      name: 'Acme SL',
      taxId: ' es-b.123-456 78 ',
      contactName: null,
      contactEmail: null,
      contactPhone: null,
    });

    expect(client.taxId).toBe('ESB12345678');

    client.changeTaxId(' b-876.543 21 ');
    expect(client.taxId).toBe('B87654321');

    client.changeTaxId(' .- ');
    expect(client.taxId).toBeNull();
  });

  it('archives and unarchives itself', () => {
    const client = Client.create({
      id: 'client-1',
      name: 'Acme SL',
      taxId: null,
      contactName: null,
      contactEmail: null,
      contactPhone: null,
    });

    client.archive('2026-09-21T00:00:00.000Z');
    expect(client.archivedAt).toBe('2026-09-21T00:00:00.000Z');
    client.unarchive();
    expect(client.archivedAt).toBeNull();
  });
});
