import { EquipmentDocument } from '../../domain/equipment-document';
import { EquipmentDocumentRepository } from '../../domain/equipment-document.repository';
import { EquipmentDocumentNotFoundException } from '../../domain/errors/equipment-document-not-found.exception';
import { GetEquipmentDocumentFileUseCase } from './get-equipment-document-file.use-case';

class FileRepository implements EquipmentDocumentRepository {
  constructor(private readonly document: EquipmentDocument | null, private readonly content: Buffer | null) {}

  findByEquipment(): Promise<EquipmentDocument[]> {
    return Promise.resolve(this.document === null ? [] : [this.document]);
  }

  findById(equipmentId: string, documentId: string): Promise<EquipmentDocument | null> {
    return Promise.resolve(
      this.document?.getEquipmentId() === equipmentId && this.document.getId() === documentId ? this.document : null,
    );
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

  findContent(equipmentId: string, documentId: string): Promise<Buffer | null> {
    return Promise.resolve(
      this.document?.getEquipmentId() === equipmentId && this.document.getId() === documentId ? this.content : null,
    );
  }
}

function buildDocument(): EquipmentDocument {
  return EquipmentDocument.create({
    id: 'equipment-document-1',
    equipmentId: 'equipment-1',
    name: 'Inspection report',
    issueDate: null,
    expiryDate: null,
    notes: null,
    fileName: 'inspection.pdf',
    mimeType: 'application/pdf',
    fileSize: 5,
  });
}

describe('GetEquipmentDocumentFileUseCase', () => {
  it('returns decrypted bytes with document metadata', async () => {
    const useCase = new GetEquipmentDocumentFileUseCase(
      new FileRepository(buildDocument(), Buffer.from('%PDF-')),
    );

    await expect(useCase.execute('equipment-1', 'equipment-document-1')).resolves.toEqual({
      content: Buffer.from('%PDF-'),
      fileName: 'inspection.pdf',
      mimeType: 'application/pdf',
    });
  });

  it('throws EquipmentDocumentNotFoundException for an unknown or mismatched document', async () => {
    const useCase = new GetEquipmentDocumentFileUseCase(new FileRepository(buildDocument(), null));

    await expect(useCase.execute('equipment-2', 'equipment-document-1')).rejects.toThrow(
      EquipmentDocumentNotFoundException,
    );
  });
});
