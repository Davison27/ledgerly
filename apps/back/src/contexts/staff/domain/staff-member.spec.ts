import { StaffMember } from './staff-member';
import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';

const BASE_PRIMITIVES = {
  id: 'staff-1',
  firstName: 'Ana',
  lastName: 'García',
  taxId: '12345678Z',
  email: 'ana.garcia@example.com',
  phone: '600111222',
  position: 'Oficial de obra',
  hireDate: '2024-01-15',
  endDate: null,
  notes: 'Contratada a jornada completa',
};

describe('StaffMember', () => {
  it('creates a staff member from valid primitives', () => {
    const staffMember = StaffMember.create(BASE_PRIMITIVES);

    expect(staffMember.toPrimitives()).toEqual(BASE_PRIMITIVES);
  });

  it('allows nullable fields to be null', () => {
    const staffMember = StaffMember.create({
      id: 'staff-2',
      firstName: 'Luis',
      lastName: 'Pérez',
      taxId: null,
      email: null,
      phone: null,
      position: null,
      hireDate: null,
      endDate: null,
      notes: null,
    });

    expect(staffMember.taxId).toBeNull();
    expect(staffMember.email).toBeNull();
    expect(staffMember.hireDate).toBeNull();
    expect(staffMember.endDate).toBeNull();
  });

  it('throws when firstName is empty', () => {
    expect(() => StaffMember.create({ ...BASE_PRIMITIVES, firstName: '  ' })).toThrow(
      InvalidValueException,
    );
  });

  it('throws when lastName is longer than 100 characters', () => {
    expect(() =>
      StaffMember.create({ ...BASE_PRIMITIVES, lastName: 'a'.repeat(101) }),
    ).toThrow(InvalidValueException);
  });

  it('throws when hireDate does not match YYYY-MM-DD', () => {
    expect(() => StaffMember.create({ ...BASE_PRIMITIVES, hireDate: '15-01-2024' })).toThrow(
      InvalidValueException,
    );
  });

  it('throws when endDate does not match YYYY-MM-DD', () => {
    expect(() =>
      StaffMember.create({ ...BASE_PRIMITIVES, endDate: 'not-a-date' }),
    ).toThrow(InvalidValueException);
  });

  it('throws when endDate is before hireDate', () => {
    expect(() =>
      StaffMember.create({ ...BASE_PRIMITIVES, hireDate: '2024-06-01', endDate: '2024-01-01' }),
    ).toThrow(InvalidValueException);
  });

  it('allows endDate to equal hireDate', () => {
    const staffMember = StaffMember.create({
      ...BASE_PRIMITIVES,
      hireDate: '2024-06-01',
      endDate: '2024-06-01',
    });

    expect(staffMember.endDate).toBe('2024-06-01');
  });

  it('updates several fields at once and re-validates them together', () => {
    const staffMember = StaffMember.create(BASE_PRIMITIVES);

    staffMember.update({ hireDate: '2025-01-01', endDate: '2025-06-01' });

    expect(staffMember.hireDate).toBe('2025-01-01');
    expect(staffMember.endDate).toBe('2025-06-01');
  });

  it('throws when an update leaves endDate before hireDate', () => {
    const staffMember = StaffMember.create(BASE_PRIMITIVES);

    expect(() => staffMember.update({ endDate: '2020-01-01' })).toThrow(InvalidValueException);
  });

  it('leaves fields not present in the update untouched', () => {
    const staffMember = StaffMember.create(BASE_PRIMITIVES);

    staffMember.update({ position: 'Encargado' });

    expect(staffMember.position).toBe('Encargado');
    expect(staffMember.firstName).toBe(BASE_PRIMITIVES.firstName);
  });
});
