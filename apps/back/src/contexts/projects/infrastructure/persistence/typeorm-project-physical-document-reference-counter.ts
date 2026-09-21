import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PhysicalDocumentReferenceCounter } from '../../domain/physical-document-reference-counter.port';

@Injectable()
export class TypeOrmProjectPhysicalDocumentReferenceCounter implements PhysicalDocumentReferenceCounter {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async countPhysicalDocumentReferences(projectId: string): Promise<number> {
    const rows: unknown = await this.dataSource.query(
      'SELECT count(*)::int AS count FROM documents WHERE project_id = $1',
      [projectId],
    );

    return Array.isArray(rows) && rows.length > 0 ? Number((rows[0] as { count: number }).count) : 0;
  }
}
