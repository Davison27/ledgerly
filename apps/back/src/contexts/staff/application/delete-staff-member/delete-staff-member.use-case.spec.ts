import { DeleteStaffMemberUseCase } from './delete-staff-member.use-case';
import { StaffMemberRepository, StaffMemberSummaryRow } from '../../domain/staff-member.repository';
import { StaffMember } from '../../domain/staff-member';
import { StaffMemberReferenceCounter } from '../../domain/staff-member-reference-counter.port';
import { StaffMemberNotFoundException } from '../../domain/errors/staff-member-not-found.exception';

class InMemoryStaffMemberRepository implements StaffMemberRepository {
  private staffMembers: StaffMember[] = [];
  readonly archivedIds: string[] = [];

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

  archive(id: string): Promise<void> {
    this.archivedIds.push(id);
    return Promise.resolve();
  }
}

class FakeStaffMemberReferenceCounter implements StaffMemberReferenceCounter {
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
    const useCase = new DeleteStaffMemberUseCase(repository, new FakeStaffMemberReferenceCounter());

    await expect(useCase.execute('staff-1')).resolves.toBe('deleted');

    expect(await repository.findById('staff-1')).toBeNull();
  });

  it('archives the staff member when they have document references', async () => {
    const repository = new InMemoryStaffMemberRepository([buildStaffMember('staff-1')]);
    const useCase = new DeleteStaffMemberUseCase(
      repository,
      new FakeStaffMemberReferenceCounter({ 'staff-1': 3 }),
    );

    await expect(useCase.execute('staff-1')).resolves.toBe('archived');
    expect(repository.archivedIds).toEqual(['staff-1']);
    expect(await repository.findById('staff-1')).not.toBeNull();
  });

  it('rejects an unknown staff member without invoking deletion', async () => {
    const repository = new InMemoryStaffMemberRepository();
    const useCase = new DeleteStaffMemberUseCase(repository, new FakeStaffMemberReferenceCounter());

    await expect(useCase.execute('missing-staff')).rejects.toThrow(StaffMemberNotFoundException);

    expect(await repository.findById('missing-staff')).toBeNull();
  });
});
