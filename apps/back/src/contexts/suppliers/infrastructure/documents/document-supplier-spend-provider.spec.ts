import { DataSource } from 'typeorm';
import { DocumentSupplierSpendProvider } from './document-supplier-spend-provider';

describe('DocumentSupplierSpendProvider', () => {
  it('excludes soft-deleted documents from supplier spend', async () => {
    const query = jest.fn().mockResolvedValue([
      { supplierId: 'supplier-1', currency: 'EUR', total: '100.50', documentCount: 2 },
    ]);
    const provider = new DocumentSupplierSpendProvider({ query } as unknown as DataSource);

    const result = await provider.findAll();

    expect(result).toEqual([
      { supplierId: 'supplier-1', currency: 'EUR', total: 100.5, documentCount: 2 },
    ]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('deleted_at IS NULL'));
  });
});
