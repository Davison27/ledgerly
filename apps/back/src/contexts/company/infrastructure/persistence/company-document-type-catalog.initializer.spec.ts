import { Repository } from 'typeorm';
import { CompanyDocumentTypeOrmEntity } from './company-document-type.orm-entity';
import {
  CompanyDocumentTypeCatalogInitializer,
  SYSTEM_COMPANY_DOCUMENT_TYPES,
} from './company-document-type-catalog.initializer';

describe('CompanyDocumentTypeCatalogInitializer', () => {
  it('upserts the nine stable system categories idempotently', async () => {
    const upsert = jest.fn().mockResolvedValue({ identifiers: [] });
    const initializer = new CompanyDocumentTypeCatalogInitializer({ upsert } as unknown as Repository<CompanyDocumentTypeOrmEntity>);

    await initializer.onApplicationBootstrap();
    await initializer.onApplicationBootstrap();

    expect(SYSTEM_COMPANY_DOCUMENT_TYPES).toHaveLength(9);
    expect(new Set(SYSTEM_COMPANY_DOCUMENT_TYPES.map((type) => type.code)).size).toBe(9);
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenNthCalledWith(1, SYSTEM_COMPANY_DOCUMENT_TYPES, ['code']);
  });
});
