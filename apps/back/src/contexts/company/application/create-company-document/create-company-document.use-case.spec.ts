import { Company } from '../../domain/company';
import { CompanyDocument } from '../../domain/company-document';
import { CompanyDocumentRepository } from '../../domain/company-document.repository';
import { CompanyDocumentType } from '../../domain/company-document-type';
import { CompanyDocumentTypeRepository } from '../../domain/company-document-type.repository';
import { CompanyRepository } from '../../domain/company.repository';
import { CompanyNotFoundException } from '../../domain/errors/company-not-found.exception';
import { CompanyDocumentTypeNotFoundException } from '../../domain/errors/company-document-type-not-found.exception';
import { IdGenerator } from '../../../../shared/domain/id-generator.port';
import { CreateCompanyDocumentCommand } from './create-company-document.command';
import { CreateCompanyDocumentUseCase } from './create-company-document.use-case';

class InMemoryCompanyDocumentRepository implements CompanyDocumentRepository {
  readonly documents = new Map<string, CompanyDocument>();
  readonly contents = new Map<string, Buffer>();

  findAll(): Promise<CompanyDocument[]> {
    return Promise.resolve([...this.documents.values()]);
  }

  findById(id: string): Promise<CompanyDocument | null> {
    return Promise.resolve(this.documents.get(id) ?? null);
  }

  save(document: CompanyDocument): Promise<void> {
    this.documents.set(document.getId(), document);
    return Promise.resolve();
  }

  delete(): Promise<boolean> {
    return Promise.resolve(true);
  }

  saveContent(id: string, content: Buffer): Promise<void> {
    this.contents.set(id, content);
    return Promise.resolve();
  }

  findContent(id: string): Promise<Buffer | null> {
    return Promise.resolve(this.contents.get(id) ?? null);
  }
}

class FakeCompanyRepository implements CompanyRepository {
  constructor(private readonly company: Company | null) {}

  find(): Promise<Company | null> {
    return Promise.resolve(this.company);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeCompanyDocumentTypeRepository implements CompanyDocumentTypeRepository {
  constructor(private readonly types: Map<string, CompanyDocumentType>) {}

  findAll(): Promise<CompanyDocumentType[]> {
    return Promise.resolve([...this.types.values()]);
  }

  findById(id: string): Promise<CompanyDocumentType | null> {
    return Promise.resolve(this.types.get(id) ?? null);
  }
}

class SequentialIdGenerator implements IdGenerator {
  generate(): string {
    return 'company-document-1';
  }
}

const TYPE: CompanyDocumentType = {
  id: 'type-1',
  code: 'civil_liability_policy',
  name: 'Civil liability policy',
  isSystem: true,
};

const COMMAND: CreateCompanyDocumentCommand = {
  typeId: TYPE.id,
  name: 'Liability policy',
  issueDate: null,
  expiryDate: null,
  notes: null,
  file: {
    buffer: Buffer.from('%PDF-1.7'),
    originalName: 'policy.pdf',
    mimeType: 'application/pdf',
    size: 8,
  },
};

function createUseCase(company: Company | null, types = new Map([[TYPE.id, TYPE]])) {
  const repository = new InMemoryCompanyDocumentRepository();
  return {
    repository,
    useCase: new CreateCompanyDocumentUseCase(
      repository,
      new FakeCompanyRepository(company),
      new FakeCompanyDocumentTypeRepository(types),
      new SequentialIdGenerator(),
    ),
  };
}

describe('CreateCompanyDocumentUseCase', () => {
  it('requires the singleton company and known type before storing a document', async () => {
    const { useCase, repository } = createUseCase(Company.create({ id: 'company-1', name: 'Ledgerly' }));

    const document = await useCase.execute(COMMAND);

    expect(document.getId()).toBe('company-document-1');
    expect(repository.documents.has(document.getId())).toBe(true);
    expect(repository.contents.get(document.getId())).toEqual(COMMAND.file.buffer);
  });

  it('throws CompanyNotFoundException when the singleton company is missing', async () => {
    const { useCase } = createUseCase(null);

    await expect(useCase.execute(COMMAND)).rejects.toThrow(CompanyNotFoundException);
  });

  it('throws CompanyDocumentTypeNotFoundException when the type is unknown', async () => {
    const { useCase } = createUseCase(Company.create({ id: 'company-1', name: 'Ledgerly' }), new Map());

    await expect(useCase.execute(COMMAND)).rejects.toThrow(CompanyDocumentTypeNotFoundException);
  });
});
