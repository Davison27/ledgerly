import { DataSource } from 'typeorm';
import { TypeOrmSupplierReferenceCounter } from './typeorm-supplier-reference-counter';

describe('TypeOrmSupplierReferenceCounter', () => {
  it('counts all supplier document references', async () => {
    const query = jest.fn<Promise<Array<{ count: number }>>, [string, string[]]>().mockResolvedValue([{ count: 4 }]);
    const counter = new TypeOrmSupplierReferenceCounter({ query } as unknown as DataSource);

    await expect(counter.count('supplier-1')).resolves.toBe(4);
    const sql = query.mock.calls[0][0];
    expect(sql).toContain('supplier_id = $1');
    expect(sql).not.toContain('deleted_at');
    expect(query).toHaveBeenCalledWith(expect.any(String), ['supplier-1']);
  });
});
