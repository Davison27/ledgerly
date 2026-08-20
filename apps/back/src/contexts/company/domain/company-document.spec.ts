import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';
import { CompanyDocument } from './company-document';

function buildDocument(overrides: Partial<Parameters<typeof CompanyDocument.create>[0]> = {}): CompanyDocument {
  return CompanyDocument.create({
    id: 'company-document-1',
    typeId: 'type-1',
    name: 'Liability policy',
    issueDate: '2026-01-01',
    expiryDate: '2026-12-31',
    notes: null,
    fileName: 'policy.pdf',
    mimeType: 'application/pdf',
    fileSize: 5,
    ...overrides,
  });
}

describe('CompanyDocument', () => {
  it('allows nullable issue dates and metadata updates', () => {
    const document = buildDocument({ issueDate: null, expiryDate: null });

    const updated = document.withChanges({ name: 'Updated policy', notes: 'Renewal' });

    expect(updated.getIssueDate()).toBeNull();
    expect(updated.getName()).toBe('Updated policy');
    expect(updated.getNotes()).toBe('Renewal');
  });

  it('rejects an expiry date before the issue date', () => {
    expect(() => buildDocument({ expiryDate: '2025-12-31' })).toThrow(InvalidValueException);
  });
});
