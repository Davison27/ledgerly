import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';
import { EquipmentDocument } from './equipment-document';

function buildDocument(overrides: Partial<Parameters<typeof EquipmentDocument.create>[0]> = {}): EquipmentDocument {
  return EquipmentDocument.create({
    id: 'equipment-document-1',
    equipmentId: 'equipment-1',
    name: 'Inspection report',
    issueDate: '2026-01-01',
    expiryDate: '2026-12-31',
    notes: null,
    fileName: 'inspection.pdf',
    mimeType: 'application/pdf',
    fileSize: 5,
    ...overrides,
  });
}

describe('EquipmentDocument', () => {
  it('allows nullable dates and preserves immutable file metadata during updates', () => {
    const document = buildDocument({ issueDate: null, expiryDate: null });

    const updated = document.withChanges({ name: 'Updated inspection', notes: 'Renewal pending' });

    expect(updated.getEquipmentId()).toBe('equipment-1');
    expect(updated.getIssueDate()).toBeNull();
    expect(updated.getName()).toBe('Updated inspection');
    expect(updated.getFileName()).toBe('inspection.pdf');
    expect(updated.getFileSize()).toBe(5);
  });

  it('rejects an expiry date before the issue date', () => {
    expect(() => buildDocument({ expiryDate: '2025-12-31' })).toThrow(InvalidValueException);
  });

  it('rejects non-PDF metadata', () => {
    expect(() => buildDocument({ mimeType: 'application/octet-stream' })).toThrow(InvalidValueException);
  });
});
