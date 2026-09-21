import { DataSource } from 'typeorm';
import { TypeOrmSupplierPhysicalDocumentReferenceCounter } from './typeorm-supplier-physical-document-reference-counter';

describe('TypeOrmSupplierPhysicalDocumentReferenceCounter', () => {
  it('counts all physical supplier document references', async () => {
    const query = jest.fn<Promise<Array<{ count: number }>>, [string, string[]]>().mockResolvedValue([{ count: 4 }]);
    const counter = new TypeOrmSupplierPhysicalDocumentReferenceCounter({ query } as unknown as DataSource);

    await expect(counter.countPhysicalDocumentReferences('supplier-1')).resolves.toBe(4);
    const sql = query.mock.calls[0][0];
    expect(sql).toContain('supplier_id = $1');
    expect(sql).not.toContain('deleted_at');
    expect(query).toHaveBeenCalledWith(expect.any(String), ['supplier-1']);
  });
});
