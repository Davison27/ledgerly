import { Repository } from 'typeorm';
import { TypeOrmStaffMemberRepository } from './typeorm-staff-member.repository';
import { StaffMemberOrmEntity } from './staff-member.orm-entity';

describe('TypeOrmStaffMemberRepository.findAllSummaryRows', () => {
  it('selects archived timestamps in summary rows', async () => {
    const archivedAt = '2026-09-21 08:00:00+00';
    const query = jest.fn().mockImplementation((sql: string) => {
      expect(sql).toContain('s.archived_at::text AS "archivedAt"');

      return Promise.resolve([
        {
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
          archivedAt,
          documentCount: '0',
          earliestExpiryDate: null,
        },
      ]);
    });
    const repository = new TypeOrmStaffMemberRepository({ manager: { query } } as unknown as Repository<StaffMemberOrmEntity>);

    await expect(repository.findAllSummaryRows()).resolves.toEqual([
      expect.objectContaining({ id: 'staff-1', archivedAt, documentCount: 0 }),
    ]);
    expect(query).toHaveBeenCalledWith(expect.any(String), [501]);
  });
});
