import { CompanyDocument } from '../../domain/company-document';
import { CompanyDocumentRepository } from '../../domain/company-document.repository';
import { CompanyDocumentNotFoundException } from '../../domain/errors/company-document-not-found.exception';
import { GetCompanyDocumentFileUseCase } from './get-company-document-file.use-case';

class FileRepository implements CompanyDocumentRepository {
  constructor(private readonly document: CompanyDocument | null, private readonly content: Buffer | null) {}

  findAll(): Promise<CompanyDocument[]> {
    return Promise.resolve(this.document ? [this.document] : []);
  }

  findById(): Promise<CompanyDocument | null> {
    return Promise.resolve(this.document);
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
    return Promise.resolve(this.content);
  }
}

function buildDocument(): CompanyDocument {
  return CompanyDocument.create({
    id: 'company-document-1',
    typeId: 'type-1',
    name: 'Policy',
    issueDate: null,
    expiryDate: null,
    notes: null,
    fileName: 'policy.pdf',
    mimeType: 'application/pdf',
    fileSize: 5,
  });
}

describe('GetCompanyDocumentFileUseCase', () => {
  it('returns the stored bytes with safe metadata', async () => {
    const useCase = new GetCompanyDocumentFileUseCase(new FileRepository(buildDocument(), Buffer.from('%PDF-')));

    await expect(useCase.execute('company-document-1')).resolves.toEqual({
      content: Buffer.from('%PDF-'),
      fileName: 'policy.pdf',
      mimeType: 'application/pdf',
    });
  });

  it('throws CompanyDocumentNotFoundException for an unknown document', async () => {
    const useCase = new GetCompanyDocumentFileUseCase(new FileRepository(null, null));

    await expect(useCase.execute('missing')).rejects.toThrow(CompanyDocumentNotFoundException);
  });
});
