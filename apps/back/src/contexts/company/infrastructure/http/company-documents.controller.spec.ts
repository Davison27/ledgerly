import type { Response } from 'express';
import { CompanyDocument } from '../../domain/company-document';
import { CompanyDocumentsController } from './company-documents.controller';
import { CreateCompanyDocumentUseCase } from '../../application/create-company-document/create-company-document.use-case';
import { DeleteCompanyDocumentUseCase } from '../../application/delete-company-document/delete-company-document.use-case';
import {
  CompanyDocumentFileResult,
  GetCompanyDocumentFileUseCase,
} from '../../application/get-company-document-file/get-company-document-file.use-case';
import { ListCompanyDocumentsUseCase } from '../../application/list-company-documents/list-company-documents.use-case';
import { UpdateCompanyDocumentCommand } from '../../application/update-company-document/update-company-document.command';
import { UpdateCompanyDocumentUseCase } from '../../application/update-company-document/update-company-document.use-case';

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

describe('CompanyDocumentsController', () => {
  let getFileExecute: jest.Mock<Promise<CompanyDocumentFileResult | null>, [string]>;
  let updateExecute: jest.Mock<Promise<CompanyDocument>, [UpdateCompanyDocumentCommand]>;
  let deleteExecute: jest.Mock<Promise<void>, [string]>;
  let controller: CompanyDocumentsController;

  beforeEach(() => {
    getFileExecute = jest.fn<Promise<CompanyDocumentFileResult | null>, [string]>().mockResolvedValue({
      content: Buffer.from('%PDF-'),
      fileName: 'policy.pdf',
      mimeType: 'application/pdf',
    });
    updateExecute = jest.fn<Promise<CompanyDocument>, [UpdateCompanyDocumentCommand]>().mockResolvedValue(buildDocument());
    deleteExecute = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);
    controller = new CompanyDocumentsController(
      {} as ListCompanyDocumentsUseCase,
      {} as CreateCompanyDocumentUseCase,
      { execute: updateExecute } as unknown as UpdateCompanyDocumentUseCase,
      { execute: deleteExecute } as unknown as DeleteCompanyDocumentUseCase,
      { execute: getFileExecute } as unknown as GetCompanyDocumentFileUseCase,
      { scan: () => Promise.resolve() },
    );
  });

  it('forwards the singleton document id when retrieving a file', async () => {
    const setResponseHeaders = jest.fn();
    const response = { set: setResponseHeaders } as unknown as Response;

    await controller.getFile('company-document-1', response);

    expect(getFileExecute).toHaveBeenCalledWith('company-document-1');
    expect(setResponseHeaders).toHaveBeenCalledWith({
      'Content-Type': 'application/pdf',
      'Cache-Control': 'no-store',
      'Content-Disposition': 'inline',
    });
  });

  it('forwards metadata updates without a company id', async () => {
    await controller.update('company-document-1', { name: 'Renewed policy' });

    expect(updateExecute).toHaveBeenCalledWith({
      id: 'company-document-1',
      name: 'Renewed policy',
      issueDate: undefined,
      expiryDate: undefined,
      notes: undefined,
    });
  });

  it('forwards deletes without a company id', async () => {
    await controller.remove('company-document-1');

    expect(deleteExecute).toHaveBeenCalledWith('company-document-1');
  });
});
