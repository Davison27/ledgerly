import { Repository } from 'typeorm';
import { StaffDocumentTypeCatalogInitializer } from './staff-document-type-catalog.initializer';
import { StaffDocumentTypeOrmEntity } from './staff-document-type.orm-entity';

describe('StaffDocumentTypeCatalogInitializer', () => {
  it('upserts the stable system categories idempotently', async () => {
    const calls: unknown[][] = [];
    const upsert = jest.fn((...args: unknown[]) => {
      calls.push(args);
      return Promise.resolve({ identifiers: [] });
    });
    const initializer = new StaffDocumentTypeCatalogInitializer(
      { upsert } as unknown as Repository<StaffDocumentTypeOrmEntity>,
    );

    await initializer.onApplicationBootstrap();
    await initializer.onApplicationBootstrap();

    expect(upsert).toHaveBeenCalledTimes(2);
    expect(calls[0]?.[0] as unknown[]).toHaveLength(9);
    expect(calls[0]?.[1]).toEqual(['code']);
  });
});
