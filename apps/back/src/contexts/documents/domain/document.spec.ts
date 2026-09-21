import { Document } from './document';
import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';
import { isCreatableDocumentType } from './document-type';

const BASE_PROPS = {
  id: 'doc-1',
  projectId: 'project-1',
  name: 'Nómina mensual',
  date: '2026-06-01',
  amount: 2100,
  status: 'paid' as const,
  direction: 'expense' as const,
};

describe('Document', () => {
  it('recognizes only invoice and tax as creatable document types', () => {
    expect(isCreatableDocumentType('invoice')).toBe(true);
    expect(isCreatableDocumentType('tax')).toBe(true);
    expect(isCreatableDocumentType('payroll')).toBe(false);
  });

  it('throws when creating a payroll document without a staffMemberId', () => {
    expect(() => Document.create({ ...BASE_PROPS, type: 'payroll' })).toThrow(InvalidValueException);
  });

  it('creates a payroll document with a staffMemberId', () => {
    const document = Document.create({ ...BASE_PROPS, type: 'payroll', staffMemberId: 'staff-1' });

    expect(document.getStaffMemberId()).toBe('staff-1');
  });

  it('creates an invoice without a staffMemberId', () => {
    const document = Document.create({ ...BASE_PROPS, type: 'invoice' });

    expect(document.getStaffMemberId()).toBeNull();
  });

  it('computes the month from the document date', () => {
    const document = Document.create({ ...BASE_PROPS, type: 'invoice' });

    expect(document.getMonth()).toBe(6);
  });

  it('throws when withChanges turns a document into payroll without a staffMemberId', () => {
    const document = Document.create({ ...BASE_PROPS, type: 'invoice' });

    expect(() => document.withChanges({ type: 'payroll' })).toThrow(InvalidValueException);
  });
});
