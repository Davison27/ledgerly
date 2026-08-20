import type { Response } from 'express';
import { CreateEquipmentDocumentCommand } from '../../application/create-equipment-document/create-equipment-document.command';
import { CreateEquipmentDocumentUseCase } from '../../application/create-equipment-document/create-equipment-document.use-case';
import { DeleteEquipmentDocumentUseCase } from '../../application/delete-equipment-document/delete-equipment-document.use-case';
import {
  EquipmentDocumentFileResult,
  GetEquipmentDocumentFileUseCase,
} from '../../application/get-equipment-document-file/get-equipment-document-file.use-case';
import { ListEquipmentDocumentsUseCase } from '../../application/list-equipment-documents/list-equipment-documents.use-case';
import { UpdateEquipmentDocumentCommand } from '../../application/update-equipment-document/update-equipment-document.command';
import { UpdateEquipmentDocumentUseCase } from '../../application/update-equipment-document/update-equipment-document.use-case';
import { EquipmentDocument } from '../../domain/equipment-document';
import { EquipmentDocumentsController } from './equipment-documents.controller';

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
    fileSize: 8,
  });
}

describe('EquipmentDocumentsController', () => {
  let listExecute: jest.Mock<Promise<EquipmentDocument[]>, [string]>;
  let createExecute: jest.Mock<Promise<EquipmentDocument>, [CreateEquipmentDocumentCommand]>;
  let updateExecute: jest.Mock<Promise<EquipmentDocument>, [UpdateEquipmentDocumentCommand]>;
  let deleteExecute: jest.Mock<Promise<void>, [string, string]>;
  let getFileExecute: jest.Mock<Promise<EquipmentDocumentFileResult | null>, [string, string]>;
  let controller: EquipmentDocumentsController;

  beforeEach(() => {
    listExecute = jest.fn<Promise<EquipmentDocument[]>, [string]>().mockResolvedValue([buildDocument()]);
    createExecute = jest.fn<Promise<EquipmentDocument>, [CreateEquipmentDocumentCommand]>().mockResolvedValue(buildDocument());
    updateExecute = jest.fn<Promise<EquipmentDocument>, [UpdateEquipmentDocumentCommand]>().mockResolvedValue(buildDocument());
    deleteExecute = jest.fn<Promise<void>, [string, string]>().mockResolvedValue(undefined);
    getFileExecute = jest.fn<Promise<EquipmentDocumentFileResult | null>, [string, string]>().mockResolvedValue({
      content: Buffer.from('%PDF-1.7'),
      fileName: 'inspection.pdf',
      mimeType: 'application/pdf',
    });
    controller = new EquipmentDocumentsController(
      { execute: listExecute } as unknown as ListEquipmentDocumentsUseCase,
      { execute: createExecute } as unknown as CreateEquipmentDocumentUseCase,
      { execute: updateExecute } as unknown as UpdateEquipmentDocumentUseCase,
      { execute: deleteExecute } as unknown as DeleteEquipmentDocumentUseCase,
      { execute: getFileExecute } as unknown as GetEquipmentDocumentFileUseCase,
    );
  });

  it('forwards the equipment route parameter when listing documents', async () => {
    await controller.list('equipment-1');

    expect(listExecute).toHaveBeenCalledWith('equipment-1');
  });

  it('accepts only a PDF upload and forwards nested metadata and content', async () => {
    const file = {
      buffer: Buffer.from('%PDF-1.7'),
      originalname: 'inspection.pdf',
      mimetype: 'application/pdf',
      size: 8,
    } as Express.Multer.File;

    await controller.create('equipment-1', JSON.stringify({ notes: 'Annual inspection' }), file);

    const command = createExecute.mock.calls[0][0];
    expect(command).toMatchObject({
      equipmentId: 'equipment-1',
      name: 'inspection.pdf',
      notes: 'Annual inspection',
    });
    expect(command.file).toMatchObject({
      originalName: 'inspection.pdf',
      mimeType: 'application/pdf',
      size: 8,
    });
  });

  it('forwards both route identifiers for metadata updates and deletion', async () => {
    await controller.update('equipment-1', 'equipment-document-1', { name: 'Renewed inspection' });
    await controller.remove('equipment-1', 'equipment-document-1');

    expect(updateExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        equipmentId: 'equipment-1',
        documentId: 'equipment-document-1',
      }),
    );
    expect(deleteExecute).toHaveBeenCalledWith('equipment-1', 'equipment-document-1');
  });

  it('serves a nested PDF inline without caching', async () => {
    const setResponseHeaders = jest.fn();
    const response = { set: setResponseHeaders } as unknown as Response;

    await controller.getFile('equipment-1', 'equipment-document-1', response);

    expect(getFileExecute).toHaveBeenCalledWith('equipment-1', 'equipment-document-1');
    expect(setResponseHeaders).toHaveBeenCalledWith({
      'Content-Type': 'application/pdf',
      'Cache-Control': 'no-store',
      'Content-Disposition': 'inline',
    });
  });
});
