import { DataSource } from 'typeorm';
import { TypeOrmProjectPhysicalDocumentReferenceCounter } from './typeorm-project-physical-document-reference-counter';

describe('TypeOrmProjectPhysicalDocumentReferenceCounter', () => {
  it('counts all physical project document references', async () => {
    const query = jest.fn<Promise<Array<{ count: number }>>, [string, string[]]>().mockResolvedValue([{ count: 3 }]);
    const counter = new TypeOrmProjectPhysicalDocumentReferenceCounter({ query } as unknown as DataSource);

    await expect(counter.countPhysicalDocumentReferences('project-1')).resolves.toBe(3);
    const sql = query.mock.calls[0][0];
    expect(sql).toContain('project_id = $1');
    expect(sql).not.toContain('deleted_at');
    expect(query).toHaveBeenCalledWith(expect.any(String), ['project-1']);
  });
});
