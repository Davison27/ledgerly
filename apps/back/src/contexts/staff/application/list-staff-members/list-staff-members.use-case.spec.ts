import { ListStaffMembersUseCase } from './list-staff-members.use-case';
import { Clock } from '../../../../shared/domain/clock.port';
import { StaffMember } from '../../domain/staff-member';
import { StaffMemberRepository, StaffMemberSummaryRow } from '../../domain/staff-member.repository';

class FixedClock implements Clock {
  constructor(private readonly date: string) {}

  now(): Date {
    return new Date(`${this.date}T12:00:00`);
  }

  todayIso(): string {
    return this.date;
  }
}

class InMemoryStaffMemberRepository implements StaffMemberRepository {
  constructor(private readonly rows: StaffMemberSummaryRow[]) {}

  findAll(): Promise<StaffMember[]> {
    return Promise.resolve([]);
  }

  findAllSummaryRows(): Promise<StaffMemberSummaryRow[]> {
    return Promise.resolve(this.rows);
  }

  findById(): Promise<StaffMember | null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }
}

function buildRow(overrides: Partial<StaffMemberSummaryRow> = {}): StaffMemberSummaryRow {
  return {
    id: 'staff-1',
    firstName: 'Ana',
    lastName: 'García',
    taxId: null,
    email: null,
    phone: null,
    position: null,
    hireDate: null,
    endDate: null,
    notes: null,
    documentCount: 0,
    earliestExpiryDate: null,
    ...overrides,
  };
}

describe('ListStaffMembersUseCase', () => {
  it('classifies summaries using the local calendar date', async () => {
    const useCase = new ListStaffMembersUseCase(
      new InMemoryStaffMemberRepository([
        buildRow({ id: 'staff-1', documentCount: 0 }),
        buildRow({
          id: 'staff-2',
          firstName: 'Luis',
          lastName: 'Pérez',
          documentCount: 2,
          earliestExpiryDate: null,
        }),
        buildRow({
          id: 'staff-3',
          firstName: 'Marta',
          lastName: 'Ruiz',
          documentCount: 1,
          earliestExpiryDate: '2026-07-31',
        }),
      ]),
      new FixedClock('2026-07-01'),
    );

    const result = await useCase.execute();

    expect(result).toEqual([
      expect.objectContaining({ id: 'staff-1', documentCount: 0, documentStatus: 'none' }),
      expect.objectContaining({ id: 'staff-2', documentCount: 2, documentStatus: 'none' }),
      expect.objectContaining({
        id: 'staff-3',
        earliestExpiryDate: '2026-07-31',
        documentStatus: 'expiring',
      }),
    ]);
  });
});
