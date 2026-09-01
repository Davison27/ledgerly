import { Document } from './document';
import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';
import { isCreatableDocumentType } from './document-type';

const BASE_PROPS = {
  id: 'doc-1',
  projectId: 'project-1',
  name: 'Nómina mensual',
  month: 6,
  date: '2026-06-01',
  amount: 2100,
  status: 'pagado' as const,
  direction: 'gasto' as const,
};

describe('Document', () => {
  it('recognizes only factura and impuesto as creatable document types', () => {
    expect(isCreatableDocumentType('factura')).toBe(true);
    expect(isCreatableDocumentType('impuesto')).toBe(true);
    expect(isCreatableDocumentType('nomina')).toBe(false);
  });

  it('throws when creating a nomina without a staffMemberId', () => {
    expect(() => Document.create({ ...BASE_PROPS, type: 'nomina' })).toThrow(InvalidValueException);
  });

  it('creates a nomina with a staffMemberId', () => {
    const document = Document.create({ ...BASE_PROPS, type: 'nomina', staffMemberId: 'staff-1' });

    expect(document.getStaffMemberId()).toBe('staff-1');
  });

  it('creates a factura without a staffMemberId', () => {
    const document = Document.create({ ...BASE_PROPS, type: 'factura' });

    expect(document.getStaffMemberId()).toBeNull();
  });

  it('throws when withChanges turns a document into a nomina without a staffMemberId', () => {
    const document = Document.create({ ...BASE_PROPS, type: 'factura' });

    expect(() => document.withChanges({ type: 'nomina' })).toThrow(InvalidValueException);
  });
});
