import { DeleteStaffMemberUseCase } from './delete-staff-member.use-case';
import { StaffMemberRepository, StaffMemberSummaryRow } from '../../domain/staff-member.repository';
import { StaffMember } from '../../domain/staff-member';
import { StaffPayrollCounter } from '../../domain/staff-payroll-counter.port';
import { StaffMemberHasPayrollsException } from '../../domain/errors/staff-member-has-payrolls.exception';

class InMemoryStaffMemberRepository implements StaffMemberRepository {
  private staffMembers: StaffMember[] = [];

  constructor(initial: StaffMember[] = []) {
    this.staffMembers = initial;
  }

  findAll(): Promise<StaffMember[]> {
    return Promise.resolve([...this.staffMembers]);
  }

  findAllSummaryRows(): Promise<StaffMemberSummaryRow[]> {
    return Promise.resolve([]);
  }

  findById(id: string): Promise<StaffMember | null> {
    return Promise.resolve(this.staffMembers.find((member) => member.id === id) ?? null);
  }

  save(staffMember: StaffMember): Promise<void> {
    this.staffMembers.push(staffMember);
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.staffMembers = this.staffMembers.filter((member) => member.id !== id);
    return Promise.resolve();
  }
}

class FakeStaffPayrollCounter implements StaffPayrollCounter {
  constructor(private readonly counts: Record<string, number> = {}) {}

  count(staffMemberId: string): Promise<number> {
    return Promise.resolve(this.counts[staffMemberId] ?? 0);
  }
}

function buildStaffMember(id: string): StaffMember {
  return StaffMember.create({
    id,
    firstName: 'Ana',
    lastName: 'García',
    taxId: null,
    email: null,
    phone: null,
    position: null,
    hireDate: null,
    endDate: null,
    notes: null,
  });
}

describe('DeleteStaffMemberUseCase', () => {
  it('deletes the staff member when they have no payrolls', async () => {
    const repository = new InMemoryStaffMemberRepository([buildStaffMember('staff-1')]);
    const useCase = new DeleteStaffMemberUseCase(repository, new FakeStaffPayrollCounter());

    await useCase.execute('staff-1');

    expect(await repository.findById('staff-1')).toBeNull();
  });

  it('throws StaffMemberHasPayrollsException and does not delete when they have payrolls', async () => {
    const repository = new InMemoryStaffMemberRepository([buildStaffMember('staff-1')]);
    const useCase = new DeleteStaffMemberUseCase(
      repository,
      new FakeStaffPayrollCounter({ 'staff-1': 3 }),
    );

    await expect(useCase.execute('staff-1')).rejects.toThrow(StaffMemberHasPayrollsException);
    expect(await repository.findById('staff-1')).not.toBeNull();
  });
});
