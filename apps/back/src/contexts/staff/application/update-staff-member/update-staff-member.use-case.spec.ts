import { UpdateStaffMemberUseCase } from './update-staff-member.use-case';
import { StaffMemberRepository } from '../../domain/staff-member.repository';
import { StaffMember } from '../../domain/staff-member';
import { StaffMemberNotFoundException } from '../../domain/errors/staff-member-not-found.exception';
import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';

class InMemoryStaffMemberRepository implements StaffMemberRepository {
  private staffMembers: StaffMember[] = [];

  constructor(initial: StaffMember[] = []) {
    this.staffMembers = initial;
  }

  findAll(): Promise<StaffMember[]> {
    return Promise.resolve([...this.staffMembers]);
  }

  findById(id: string): Promise<StaffMember | null> {
    return Promise.resolve(this.staffMembers.find((member) => member.id === id) ?? null);
  }

  save(staffMember: StaffMember): Promise<void> {
    const index = this.staffMembers.findIndex((existing) => existing.id === staffMember.id);

    if (index === -1) {
      this.staffMembers.push(staffMember);
    } else {
      this.staffMembers[index] = staffMember;
    }

    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.staffMembers = this.staffMembers.filter((member) => member.id !== id);
    return Promise.resolve();
  }
}

function buildStaffMember(): StaffMember {
  return StaffMember.create({
    id: 'staff-1',
    firstName: 'Ana',
    lastName: 'García',
    taxId: '12345678Z',
    email: 'ana.garcia@example.com',
    phone: '600111222',
    position: 'Oficial de obra',
    hireDate: '2024-01-15',
    endDate: null,
    notes: null,
  });
}

describe('UpdateStaffMemberUseCase', () => {
  it('updates only the fields present in the command', async () => {
    const repository = new InMemoryStaffMemberRepository([buildStaffMember()]);
    const useCase = new UpdateStaffMemberUseCase(repository);

    const updated = await useCase.execute({ id: 'staff-1', position: 'Encargado' });

    expect(updated.position).toBe('Encargado');
    expect(updated.firstName).toBe('Ana');
    expect(updated.taxId).toBe('12345678Z');
  });

  it('sets a nullable field to null when the command explicitly carries null', async () => {
    const repository = new InMemoryStaffMemberRepository([buildStaffMember()]);
    const useCase = new UpdateStaffMemberUseCase(repository);

    const updated = await useCase.execute({ id: 'staff-1', taxId: null });

    expect(updated.taxId).toBeNull();
  });

  it('gives a staff member an end date (baja) without deleting them', async () => {
    const repository = new InMemoryStaffMemberRepository([buildStaffMember()]);
    const useCase = new UpdateStaffMemberUseCase(repository);

    const updated = await useCase.execute({ id: 'staff-1', endDate: '2026-07-01' });

    expect(updated.endDate).toBe('2026-07-01');
  });

  it('throws StaffMemberNotFoundException when the staff member does not exist', async () => {
    const repository = new InMemoryStaffMemberRepository();
    const useCase = new UpdateStaffMemberUseCase(repository);

    await expect(useCase.execute({ id: 'missing-id', position: 'Encargado' })).rejects.toThrow(
      StaffMemberNotFoundException,
    );
  });

  it('throws InvalidValueException when the update leaves endDate before hireDate', async () => {
    const repository = new InMemoryStaffMemberRepository([buildStaffMember()]);
    const useCase = new UpdateStaffMemberUseCase(repository);

    await expect(useCase.execute({ id: 'staff-1', endDate: '2020-01-01' })).rejects.toThrow(
      InvalidValueException,
    );
  });
});
