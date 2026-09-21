import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ProjectDocumentCounter } from '../../domain/project-document-counter.port';

@Injectable()
export class TypeOrmProjectDocumentCounter implements ProjectDocumentCounter {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async count(projectId: string): Promise<number> {
    const rows: unknown = await this.dataSource.query(
      'SELECT count(*)::int AS count FROM documents WHERE project_id = $1',
      [projectId],
    );

    return Array.isArray(rows) && rows.length > 0 ? Number((rows[0] as { count: number }).count) : 0;
  }
}
