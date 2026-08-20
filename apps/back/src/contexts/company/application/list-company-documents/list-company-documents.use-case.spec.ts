import { CompanyDocument } from '../../domain/company-document';
import { CompanyDocumentRepository } from '../../domain/company-document.repository';
import { CompanyDocumentType } from '../../domain/company-document-type';
import { CompanyDocumentTypeRepository } from '../../domain/company-document-type.repository';
import { CompanyDocumentTypeNotFoundException } from '../../domain/errors/company-document-type-not-found.exception';
import { ListCompanyDocumentsUseCase } from './list-company-documents.use-case';

class FakeDocumentRepository implements CompanyDocumentRepository {
  findAll(typeId?: string): Promise<CompanyDocument[]> {
    return Promise.resolve(
      typeId === 'type-1'
        ? [
            CompanyDocument.fromPrimitives({
              id: 'document-1',
              typeId,
              name: 'Policy',
              issueDate: null,
              expiryDate: null,
              notes: null,
              fileName: 'policy.pdf',
              mimeType: 'application/pdf',
              fileSize: 5,
            }),
          ]
        : [],
    );
  }

  findById(): Promise<CompanyDocument | null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  delete(): Promise<boolean> {
    return Promise.resolve(true);
  }

  saveContent(): Promise<void> {
    return Promise.resolve();
  }

  findContent(): Promise<Buffer | null> {
    return Promise.resolve(null);
  }
}

class FakeTypeRepository implements CompanyDocumentTypeRepository {
  constructor(private readonly type: CompanyDocumentType | null) {}

  findAll(): Promise<CompanyDocumentType[]> {
    return Promise.resolve(this.type ? [this.type] : []);
  }

  findById(): Promise<CompanyDocumentType | null> {
    return Promise.resolve(this.type);
  }
}

describe('ListCompanyDocumentsUseCase', () => {
  it('rejects an unknown type filter instead of silently returning an empty list', async () => {
    const useCase = new ListCompanyDocumentsUseCase(
      new FakeDocumentRepository(),
      new FakeTypeRepository(null),
    );

    await expect(useCase.execute('missing')).rejects.toThrow(CompanyDocumentTypeNotFoundException);
  });
});
