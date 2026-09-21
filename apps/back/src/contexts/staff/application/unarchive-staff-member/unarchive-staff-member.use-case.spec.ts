import { StaffMember } from '../../domain/staff-member';
import { StaffMemberRepository } from '../../domain/staff-member.repository';
import { StaffMemberNotFoundException } from '../../domain/errors/staff-member-not-found.exception';
import { UnarchiveStaffMemberUseCase } from './unarchive-staff-member.use-case';

function buildStaffMember(): StaffMember {
  return StaffMember.create({
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
  });
}

describe('UnarchiveStaffMemberUseCase', () => {
  it('clears the archive marker for an existing staff member', async () => {
    const unarchive = jest.fn().mockResolvedValue(undefined);
    const repository = {
      findById: jest.fn().mockResolvedValue(buildStaffMember()),
      unarchive,
    } as unknown as StaffMemberRepository;
    const useCase = new UnarchiveStaffMemberUseCase(repository);

    await useCase.execute('staff-1');

    expect(unarchive).toHaveBeenCalledWith('staff-1');
  });

  it('rejects an unknown staff member', async () => {
    const unarchive = jest.fn();
    const repository = {
      findById: jest.fn().mockResolvedValue(null),
      unarchive,
    } as unknown as StaffMemberRepository;
    const useCase = new UnarchiveStaffMemberUseCase(repository);

    await expect(useCase.execute('missing-staff')).rejects.toThrow(StaffMemberNotFoundException);
    expect(unarchive).not.toHaveBeenCalled();
  });
});
