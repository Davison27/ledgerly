import { DataSource } from 'typeorm';
import { TypeOrmProjectFinancialsProvider } from './typeorm-project-financials-provider';

describe('TypeOrmProjectFinancialsProvider', () => {
  it('keeps only dated project lease expenses and converts numeric values', async () => {
    const query = jest.fn().mockResolvedValue([
      { projectId: 'project-1', currency: 'EUR', income: '100.50', expenses: '25.25' },
    ]);
    const provider = new TypeOrmProjectFinancialsProvider({ query } as unknown as DataSource);

    const result = await provider.findAll();

    expect(result).toEqual([
      { projectId: 'project-1', currency: 'EUR', income: 100.5, expenses: 25.25 },
    ]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('pp.lease_expense_date IS NOT NULL'));
  });
});
