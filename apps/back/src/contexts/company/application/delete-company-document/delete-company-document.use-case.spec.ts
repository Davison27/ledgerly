import { CompanyDocument } from '../../domain/company-document';
import { CompanyDocumentRepository } from '../../domain/company-document.repository';
import { CompanyDocumentNotFoundException } from '../../domain/errors/company-document-not-found.exception';
import { DeleteCompanyDocumentUseCase } from './delete-company-document.use-case';

class AtomicDeleteRepository implements CompanyDocumentRepository {
  deleteCalls: string[] = [];

  findAll(): Promise<CompanyDocument[]> {
    return Promise.resolve([]);
  }

  findById(): Promise<CompanyDocument | null> {
    throw new Error('delete must not pre-load the document');
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  delete(id: string): Promise<boolean> {
    this.deleteCalls.push(id);
    return Promise.resolve(id === 'existing');
  }

  saveContent(): Promise<void> {
    return Promise.resolve();
  }

  findContent(): Promise<Buffer | null> {
    return Promise.resolve(null);
  }
}

describe('DeleteCompanyDocumentUseCase', () => {
  it('uses the affected-row result as the not-found boundary', async () => {
    const repository = new AtomicDeleteRepository();
    const useCase = new DeleteCompanyDocumentUseCase(repository);

    await useCase.execute('existing');

    expect(repository.deleteCalls).toEqual(['existing']);
  });

  it('throws CompanyDocumentNotFoundException when no row is affected', async () => {
    const repository = new AtomicDeleteRepository();
    const useCase = new DeleteCompanyDocumentUseCase(repository);

    await expect(useCase.execute('missing')).rejects.toThrow(CompanyDocumentNotFoundException);
    expect(repository.deleteCalls).toEqual(['missing']);
  });
});
