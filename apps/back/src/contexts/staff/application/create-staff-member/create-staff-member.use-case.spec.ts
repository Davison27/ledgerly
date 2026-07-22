import { CreateStaffMemberUseCase } from './create-staff-member.use-case';
import { StaffMemberRepository } from '../../domain/staff-member.repository';
import { StaffMember } from '../../domain/staff-member';
import { IdGenerator } from '../../../../shared/domain/id-generator.port';
import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';

class InMemoryStaffMemberRepository implements StaffMemberRepository {
  private staffMembers: StaffMember[] = [];

  findAll(): Promise<StaffMember[]> {
    return Promise.resolve([...this.staffMembers]);
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

class SequentialIdGenerator implements IdGenerator {
  private nextId = 1;

  generate(): string {
    return `staff-${this.nextId++}`;
  }
}

describe('CreateStaffMemberUseCase', () => {
  it('creates a staff member with the minimum required fields', async () => {
    const repository = new InMemoryStaffMemberRepository();
    const useCase = new CreateStaffMemberUseCase(repository, new SequentialIdGenerator());

    const staffMember = await useCase.execute({ firstName: 'Ana', lastName: 'García' });

    expect(staffMember.id).toBe('staff-1');
    expect(staffMember.firstName).toBe('Ana');
    expect(staffMember.lastName).toBe('García');
    expect(staffMember.taxId).toBeNull();
    expect(await repository.findById(staffMember.id)).not.toBeNull();
  });

  it('creates a staff member with every optional field', async () => {
    const repository = new InMemoryStaffMemberRepository();
    const useCase = new CreateStaffMemberUseCase(repository, new SequentialIdGenerator());

    const staffMember = await useCase.execute({
      firstName: 'Luis',
      lastName: 'Pérez',
      taxId: '12345678Z',
      email: 'luis.perez@example.com',
      phone: '600111222',
      position: 'Encargado',
      hireDate: '2024-01-15',
      endDate: null,
      notes: 'Nota',
    });

    expect(staffMember.taxId).toBe('12345678Z');
    expect(staffMember.position).toBe('Encargado');
  });

  it('throws InvalidValueException when the name is empty', async () => {
    const repository = new InMemoryStaffMemberRepository();
    const useCase = new CreateStaffMemberUseCase(repository, new SequentialIdGenerator());

    await expect(useCase.execute({ firstName: '  ', lastName: 'Pérez' })).rejects.toThrow(
      InvalidValueException,
    );
  });
});
