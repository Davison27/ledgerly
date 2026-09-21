import { DataSource } from 'typeorm';
import { TypeOrmStaffPayrollCounter } from './typeorm-staff-payroll-counter';

describe('TypeOrmStaffPayrollCounter', () => {
  it('counts all staff document references', async () => {
    const query = jest.fn<Promise<Array<{ count: number }>>, [string, string[]]>().mockResolvedValue([{ count: 3 }]);
    const counter = new TypeOrmStaffPayrollCounter({ query } as unknown as DataSource);

    const result = await counter.count('staff-1');

    expect(result).toBe(3);
    const sql = query.mock.calls[0][0];
    expect(sql).toContain('staff_member_id = $1');
    expect(sql).not.toContain('deleted_at');
    expect(query).toHaveBeenCalledWith(expect.any(String), ['staff-1']);
  });
});
