import { DataSource } from 'typeorm';
import { TypeOrmProjectDocumentCounter } from './typeorm-project-document-counter';

describe('TypeOrmProjectDocumentCounter', () => {
  it('counts all project document references', async () => {
    const query = jest.fn<Promise<Array<{ count: number }>>, [string, string[]]>().mockResolvedValue([{ count: 3 }]);
    const counter = new TypeOrmProjectDocumentCounter({ query } as unknown as DataSource);

    await expect(counter.count('project-1')).resolves.toBe(3);
    const sql = query.mock.calls[0][0];
    expect(sql).toContain('project_id = $1');
    expect(sql).not.toContain('deleted_at');
    expect(query).toHaveBeenCalledWith(expect.any(String), ['project-1']);
  });
});
