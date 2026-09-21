import { DataSource } from 'typeorm';
import { TypeOrmStaffPhysicalDocumentReferenceCounter } from './typeorm-staff-physical-document-reference-counter';

describe('TypeOrmStaffPhysicalDocumentReferenceCounter', () => {
  it('counts all physical staff document references', async () => {
    const query = jest.fn<Promise<Array<{ count: number }>>, [string, string[]]>().mockResolvedValue([{ count: 3 }]);
    const counter = new TypeOrmStaffPhysicalDocumentReferenceCounter({ query } as unknown as DataSource);

    await expect(counter.countPhysicalDocumentReferences('staff-1')).resolves.toBe(3);
    const sql = query.mock.calls[0][0];
    expect(sql).toContain('staff_member_id = $1');
    expect(sql).not.toContain('deleted_at');
    expect(query).toHaveBeenCalledWith(expect.any(String), ['staff-1']);
  });
});
