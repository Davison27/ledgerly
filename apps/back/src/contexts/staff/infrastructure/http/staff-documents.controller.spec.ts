import type { Response } from 'express';
import { StaffDocumentsController } from './staff-documents.controller';
import { ListStaffDocumentsUseCase } from '../../application/list-staff-documents/list-staff-documents.use-case';
import { CreateStaffDocumentUseCase } from '../../application/create-staff-document/create-staff-document.use-case';
import { UpdateStaffDocumentUseCase } from '../../application/update-staff-document/update-staff-document.use-case';
import { UpdateStaffDocumentCommand } from '../../application/update-staff-document/update-staff-document.command';
import { DeleteStaffDocumentUseCase } from '../../application/delete-staff-document/delete-staff-document.use-case';
import {
  GetStaffDocumentFileUseCase,
  StaffDocumentFileResult,
} from '../../application/get-staff-document-file/get-staff-document-file.use-case';
import { StaffDocument } from '../../domain/staff-document';
import { StaffDocumentNotFoundException } from '../../domain/errors/staff-document-not-found.exception';

function buildDocument(): StaffDocument {
  return StaffDocument.create({
    id: 'staff-doc-1',
    staffMemberId: 'staff-1',
    typeId: 'type-dni',
    name: 'DNI Ana García',
    issueDate: '2024-01-10',
    fileName: 'dni.pdf',
    mimeType: 'application/pdf',
    fileSize: 4,
  });
}

describe('StaffDocumentsController', () => {
  let getFileExecute: jest.Mock<Promise<StaffDocumentFileResult | null>, [string, string?]>;
  let updateExecute: jest.Mock<Promise<StaffDocument>, [UpdateStaffDocumentCommand]>;
  let deleteExecute: jest.Mock<Promise<void>, [string, string?]>;
  let controller: StaffDocumentsController;

  beforeEach(() => {
    getFileExecute = jest
      .fn<Promise<StaffDocumentFileResult | null>, [string, string?]>()
      .mockResolvedValue({
        content: Buffer.from('file'),
        fileName: 'dni.pdf',
        mimeType: 'application/pdf',
      });
    updateExecute = jest
      .fn<Promise<StaffDocument>, [UpdateStaffDocumentCommand]>()
      .mockResolvedValue(buildDocument());
    deleteExecute = jest.fn<Promise<void>, [string, string?]>().mockResolvedValue(undefined);
    controller = new StaffDocumentsController(
      {} as ListStaffDocumentsUseCase,
      {} as CreateStaffDocumentUseCase,
      { execute: updateExecute } as unknown as UpdateStaffDocumentUseCase,
      { execute: deleteExecute } as unknown as DeleteStaffDocumentUseCase,
      { execute: getFileExecute } as unknown as GetStaffDocumentFileUseCase,
    );
  });

  it('forwards the staff member route parameter when retrieving a file', async () => {
    const response = { set: jest.fn() } as unknown as Response;

    await controller.getFile('staff-1', 'staff-doc-1', response);

    expect(getFileExecute).toHaveBeenCalledWith('staff-doc-1', 'staff-1');
  });

  it('forwards the staff member route parameter when updating a document', async () => {
    await controller.update(
      'staff-1',
      'staff-doc-1',
      { name: 'DNI renovado' },
    );

    expect(updateExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'staff-doc-1',
        staffMemberId: 'staff-1',
        name: 'DNI renovado',
      }),
    );
  });

  it('forwards the staff member route parameter when deleting a document', async () => {
    await controller.remove('staff-1', 'staff-doc-1');

    expect(deleteExecute).toHaveBeenCalledWith('staff-doc-1', 'staff-1');
  });

  it('does not alter the generic not-found error returned for a nested file', async () => {
    getFileExecute.mockRejectedValueOnce(new StaffDocumentNotFoundException());
    const response = { set: jest.fn() } as unknown as Response;

    await expect(controller.getFile('staff-2', 'staff-doc-1', response)).rejects.toMatchObject({
      code: 'ENTITY_NOT_FOUND',
      message: 'Staff document was not found',
    });
  });
});
