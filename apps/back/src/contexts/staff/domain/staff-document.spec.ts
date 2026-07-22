import { StaffDocument } from './staff-document';
import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';

function buildDocument(): StaffDocument {
  return StaffDocument.create({
    id: 'staff-doc-1',
    staffMemberId: 'staff-1',
    typeId: 'type-dni',
    name: 'DNI Ana García',
    issueDate: '2024-01-10',
    expiryDate: '2030-01-10',
    notes: null,
    fileName: 'dni.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024,
  });
}

describe('StaffDocument', () => {
  it('creates a staff document from valid props', () => {
    const document = buildDocument();

    expect(document.getName()).toBe('DNI Ana García');
    expect(document.getExpiryDate()).toBe('2030-01-10');
  });

  it('allows a document without an expiry date', () => {
    const document = StaffDocument.create({
      id: 'staff-doc-2',
      staffMemberId: 'staff-1',
      typeId: 'type-varios',
      name: 'Varios',
      issueDate: '2024-01-10',
      fileName: 'varios.pdf',
      mimeType: 'application/pdf',
      fileSize: 512,
    });

    expect(document.getExpiryDate()).toBeNull();
  });

  it('throws when issueDate does not match YYYY-MM-DD', () => {
    expect(() =>
      StaffDocument.create({
        id: 'staff-doc-1',
        staffMemberId: 'staff-1',
        typeId: 'type-dni',
        name: 'DNI',
        issueDate: '10-01-2024',
        fileName: 'dni.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
      }),
    ).toThrow(InvalidValueException);
  });

  it('throws when expiryDate is before issueDate', () => {
    expect(() =>
      StaffDocument.create({
        id: 'staff-doc-1',
        staffMemberId: 'staff-1',
        typeId: 'type-dni',
        name: 'DNI',
        issueDate: '2024-06-01',
        expiryDate: '2024-01-01',
        fileName: 'dni.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
      }),
    ).toThrow(InvalidValueException);
  });

  it('throws when fileSize is negative', () => {
    expect(() =>
      StaffDocument.create({
        id: 'staff-doc-1',
        staffMemberId: 'staff-1',
        typeId: 'type-dni',
        name: 'DNI',
        issueDate: '2024-06-01',
        fileName: 'dni.pdf',
        mimeType: 'application/pdf',
        fileSize: -1,
      }),
    ).toThrow(InvalidValueException);
  });

  it('applies changes through withChanges, re-validating the result', () => {
    const document = buildDocument();

    const updated = document.withChanges({ name: 'DNI renovado', expiryDate: '2031-01-10' });

    expect(updated.getName()).toBe('DNI renovado');
    expect(updated.getExpiryDate()).toBe('2031-01-10');
    expect(updated.getFileName()).toBe('dni.pdf');
  });

  it('throws when withChanges leaves expiryDate before issueDate', () => {
    const document = buildDocument();

    expect(() => document.withChanges({ expiryDate: '2020-01-01' })).toThrow(InvalidValueException);
  });
});
