import { Document } from './document';
import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';

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
  // D3 of the staff-section plan: a payroll always carries a staff member,
  // whichever side (project or staff member) it is uploaded from.
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

  // `withChanges()` reruns `create()` (document.ts), so editing an existing
  // document into type `nomina` without a staff member must be caught too.
  it('throws when withChanges turns a document into a nomina without a staffMemberId', () => {
    const document = Document.create({ ...BASE_PROPS, type: 'factura' });

    expect(() => document.withChanges({ type: 'nomina' })).toThrow(InvalidValueException);
  });
});
