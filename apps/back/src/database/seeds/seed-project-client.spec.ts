import { resolveSeedProjectClientId } from './seed-project-client';

describe('resolveSeedProjectClientId', () => {
  it('resolves a project to a declared active client', () => {
    const clients = new Map([
      ['B12345678', { id: 'client-1' }],
    ]);

    expect(resolveSeedProjectClientId({ clientKey: 'B12345678' }, clients)).toBe('client-1');
  });

  it('rejects an archived client even when its tax ID is declared', () => {
    const clients = new Map([
      ['B66778899', { id: 'client-archived', archivedAt: '2024-01-01T00:00:00.000Z' }],
    ]);

    expect(() => resolveSeedProjectClientId({ clientKey: 'B66778899' }, clients)).toThrow(
      'Seed project client key must resolve to a declared active client: B66778899',
    );
  });

  it('rejects an undeclared client key', () => {
    expect(() => resolveSeedProjectClientId({ clientKey: 'B00000000' }, new Map())).toThrow(
      'Seed project client key must resolve to a declared active client: B00000000',
    );
  });
});
