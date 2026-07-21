import { StaffMember } from '../../../staff/domain/staff-member';

interface DemoStaffMemberSeed {
  firstName: string;
  lastName: string;
  position: string;
  hireOffsetDays: number;
}

const RAW_STAFF_MEMBERS: DemoStaffMemberSeed[] = [
  { firstName: 'Ana', lastName: 'García', position: 'Oficial de obra', hireOffsetDays: -400 },
  { firstName: 'Luis', lastName: 'Pérez', position: 'Encargado', hireOffsetDays: -730 },
  { firstName: 'Marta', lastName: 'Ruiz', position: 'Administrativa', hireOffsetDays: -200 },
];

function isoDateWithOffset(base: Date, offsetDays: number): string {
  const date = new Date(base);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

/**
 * Builds the demo staff members (D4/U2.8): the demo loader stops creating
 * payrolls without a staff member, so it needs someone to imput them to.
 * The first two are referenced by `demo-documents.ts`'s `nomina` seeds via
 * `staffMemberIndex`; the third exists so the Personal section isn't a
 * one-row list.
 */
export function buildDemoStaffMembers(generateId: () => string): StaffMember[] {
  const today = new Date();

  return RAW_STAFF_MEMBERS.map((seed) =>
    StaffMember.create({
      id: generateId(),
      firstName: seed.firstName,
      lastName: seed.lastName,
      taxId: null,
      email: null,
      phone: null,
      position: seed.position,
      hireDate: isoDateWithOffset(today, seed.hireOffsetDays),
      endDate: null,
      notes: null,
    }),
  );
}
