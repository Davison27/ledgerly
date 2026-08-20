import { CompanyDocument } from '../../domain/company-document';
import { CompanyDocumentRepository } from '../../domain/company-document.repository';
import { CompanyDocumentNotFoundException } from '../../domain/errors/company-document-not-found.exception';
import { UpdateCompanyDocumentUseCase } from './update-company-document.use-case';

class InMemoryCompanyDocumentRepository implements CompanyDocumentRepository {
  constructor(private document: CompanyDocument | null) {}

  findAll(): Promise<CompanyDocument[]> {
    return Promise.resolve(this.document ? [this.document] : []);
  }

  findById(): Promise<CompanyDocument | null> {
    return Promise.resolve(this.document);
  }

  save(document: CompanyDocument): Promise<void> {
    this.document = document;
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

  current(): CompanyDocument | null {
    return this.document;
  }
}

function buildDocument(): CompanyDocument {
  return CompanyDocument.create({
    id: 'company-document-1',
    typeId: 'type-1',
    name: 'Policy',
    issueDate: '2026-01-01',
    expiryDate: null,
    notes: null,
    fileName: 'policy.pdf',
    mimeType: 'application/pdf',
    fileSize: 5,
  });
}

describe('UpdateCompanyDocumentUseCase', () => {
  it('updates metadata without changing file identity', async () => {
    const repository = new InMemoryCompanyDocumentRepository(buildDocument());
    const useCase = new UpdateCompanyDocumentUseCase(repository);

    const updated = await useCase.execute({ id: 'company-document-1', name: 'Renewed policy', notes: '2026' });

    expect(updated.getName()).toBe('Renewed policy');
    expect(updated.getNotes()).toBe('2026');
    expect(updated.getFileName()).toBe('policy.pdf');
    expect(repository.current()?.getTypeId()).toBe('type-1');
  });

  it('throws CompanyDocumentNotFoundException for an unknown document', async () => {
    const useCase = new UpdateCompanyDocumentUseCase(new InMemoryCompanyDocumentRepository(null));

    await expect(useCase.execute({ id: 'missing', name: 'Policy' })).rejects.toThrow(CompanyDocumentNotFoundException);
  });
});
