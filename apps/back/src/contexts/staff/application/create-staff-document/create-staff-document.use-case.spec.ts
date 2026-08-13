import { CreateStaffDocumentUseCase } from './create-staff-document.use-case';
import { StaffDocumentRepository } from '../../domain/staff-document.repository';
import { StaffDocument } from '../../domain/staff-document';
import {
  StaffMemberRepository,
  StaffMemberSummaryRow,
} from '../../domain/staff-member.repository';
import { StaffMember } from '../../domain/staff-member';
import { StaffDocumentTypeRepository } from '../../domain/staff-document-type.repository';
import { StaffDocumentType } from '../../domain/staff-document-type';
import { StaffMemberNotFoundException } from '../../domain/errors/staff-member-not-found.exception';
import { StaffDocumentTypeNotFoundException } from '../../domain/errors/staff-document-type-not-found.exception';
import { IdGenerator } from '../../../../shared/domain/id-generator.port';

class InMemoryStaffDocumentRepository implements StaffDocumentRepository {
  private documents: StaffDocument[] = [];
  private contents = new Map<string, Buffer>();

  findByStaffMember(staffMemberId: string): Promise<StaffDocument[]> {
    return Promise.resolve(
      this.documents.filter((document) => document.getStaffMemberId() === staffMemberId),
    );
  }

  findById(id: string): Promise<StaffDocument | null> {
    return Promise.resolve(this.documents.find((document) => document.getId() === id) ?? null);
  }

  save(staffDocument: StaffDocument): Promise<void> {
    this.documents.push(staffDocument);
    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }

  saveContent(staffDocumentId: string, content: Buffer): Promise<void> {
    this.contents.set(staffDocumentId, content);
    return Promise.resolve();
  }

  findContent(staffDocumentId: string): Promise<Buffer | null> {
    return Promise.resolve(this.contents.get(staffDocumentId) ?? null);
  }
}

class FakeStaffMemberRepository implements StaffMemberRepository {
  constructor(private readonly existingIds: Set<string>) {}

  findAll(): Promise<StaffMember[]> {
    return Promise.resolve([]);
  }

  findAllSummaryRows(): Promise<StaffMemberSummaryRow[]> {
    return Promise.resolve([]);
  }

  findById(id: string): Promise<StaffMember | null> {
    if (!this.existingIds.has(id)) {
      return Promise.resolve(null);
    }

    return Promise.resolve(
      StaffMember.create({
        id,
        firstName: 'Ana',
        lastName: 'García',
        taxId: null,
        email: null,
        phone: null,
        position: null,
        hireDate: null,
        endDate: null,
        notes: null,
      }),
    );
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeStaffDocumentTypeRepository implements StaffDocumentTypeRepository {
  constructor(private readonly types: Map<string, StaffDocumentType>) {}

  findAll(): Promise<StaffDocumentType[]> {
    return Promise.resolve([...this.types.values()]);
  }

  findById(id: string): Promise<StaffDocumentType | null> {
    return Promise.resolve(this.types.get(id) ?? null);
  }
}

class SequentialIdGenerator implements IdGenerator {
  private nextId = 1;

  generate(): string {
    return `staff-doc-${this.nextId++}`;
  }
}

const DNI_TYPE: StaffDocumentType = {
  id: 'type-dni',
  code: 'dni',
  name: 'DNI',
  expires: true,
  defaultValidityMonths: null,
  isSystem: true,
};

const BASE_COMMAND = {
  staffMemberId: 'staff-1',
  typeId: 'type-dni',
  name: 'DNI Ana García',
  issueDate: '2024-01-10',
  file: {
    buffer: Buffer.from('file content'),
    originalName: 'dni.pdf',
    mimeType: 'application/pdf',
    size: 12,
  },
};

describe('CreateStaffDocumentUseCase', () => {
  it('creates a staff document and stores its content', async () => {
    const repository = new InMemoryStaffDocumentRepository();
    const staffMemberRepository = new FakeStaffMemberRepository(new Set(['staff-1']));
    const typeRepository = new FakeStaffDocumentTypeRepository(new Map([['type-dni', DNI_TYPE]]));
    const useCase = new CreateStaffDocumentUseCase(
      repository,
      staffMemberRepository,
      typeRepository,
      new SequentialIdGenerator(),
    );

    const document = await useCase.execute(BASE_COMMAND);

    expect(document.getId()).toBe('staff-doc-1');
    expect(document.getFileName()).toBe('dni.pdf');
    expect(await repository.findContent(document.getId())).toEqual(Buffer.from('file content'));
  });

  it('throws StaffMemberNotFoundException when the staff member does not exist', async () => {
    const repository = new InMemoryStaffDocumentRepository();
    const staffMemberRepository = new FakeStaffMemberRepository(new Set());
    const typeRepository = new FakeStaffDocumentTypeRepository(new Map([['type-dni', DNI_TYPE]]));
    const useCase = new CreateStaffDocumentUseCase(
      repository,
      staffMemberRepository,
      typeRepository,
      new SequentialIdGenerator(),
    );

    await expect(useCase.execute(BASE_COMMAND)).rejects.toThrow(StaffMemberNotFoundException);
  });

  it('throws StaffDocumentTypeNotFoundException when the type does not exist', async () => {
    const repository = new InMemoryStaffDocumentRepository();
    const staffMemberRepository = new FakeStaffMemberRepository(new Set(['staff-1']));
    const typeRepository = new FakeStaffDocumentTypeRepository(new Map());
    const useCase = new CreateStaffDocumentUseCase(
      repository,
      staffMemberRepository,
      typeRepository,
      new SequentialIdGenerator(),
    );

    await expect(useCase.execute(BASE_COMMAND)).rejects.toThrow(StaffDocumentTypeNotFoundException);
  });
});
