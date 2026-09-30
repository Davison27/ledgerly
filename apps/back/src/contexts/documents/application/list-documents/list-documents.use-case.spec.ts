import { ListDocumentsUseCase } from './list-documents.use-case';
import { DocumentRepository } from '../../domain/document.repository';
import { ProjectExistenceChecker } from '../../domain/project-existence-checker.port';
import { Document } from '../../domain/document';

function buildDocument(type: 'invoice' | 'payroll'): Document {
  return Document.create({
    id: type === 'payroll' ? 'payroll-1' : 'invoice-1',
    projectId: 'project-1',
    name: type === 'payroll' ? 'Payroll' : 'Invoice',
    type,
    staffMemberId: type === 'payroll' ? 'staff-1' : null,
    date: '2026-06-15',
    amount: 100,
    status: 'pending',
    direction: 'expense',
  });
}

function existingProjectChecker(): ProjectExistenceChecker {
  return { exists: () => Promise.resolve(true) };
}

describe('ListDocumentsUseCase payroll visibility fallback', () => {
  it('filters payroll before fallback pagination while retaining invoices', async () => {
    const documents = [buildDocument('payroll'), buildDocument('invoice')];
    const repository = {
      findByProject: jest.fn().mockResolvedValue(documents),
    } as unknown as DocumentRepository;
    const projectExistenceChecker = existingProjectChecker();
    const useCase = new ListDocumentsUseCase(repository, projectExistenceChecker);

    const page = await useCase.executePage(
      { projectId: 'project-1', filters: { includePayroll: false } },
      { page: 1, size: 1 },
    );
    const all = await useCase.execute({ projectId: 'project-1', filters: { includePayroll: false } });

    expect(page).toMatchObject({
      items: [expect.objectContaining({ id: 'invoice-1' })],
      total: 1,
      page: 1,
      size: 1,
    });
    expect(all.map((document) => document.getId())).toEqual(['invoice-1']);
  });

  it('returns an empty page when the only project documents are payroll', async () => {
    const repository = {
      findByProject: jest.fn().mockResolvedValue([buildDocument('payroll')]),
    } as unknown as DocumentRepository;
    const useCase = new ListDocumentsUseCase(repository, existingProjectChecker());

    await expect(
      useCase.executePage(
        { projectId: 'project-1', filters: { includePayroll: false } },
        { page: 1, size: 10 },
      ),
    ).resolves.toMatchObject({ items: [], total: 0, page: 1, size: 10 });
  });
});
