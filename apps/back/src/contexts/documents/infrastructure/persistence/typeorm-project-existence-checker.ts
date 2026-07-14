import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ProjectExistenceChecker } from '../../domain/project-existence-checker.port';

@Injectable()
export class TypeOrmProjectExistenceChecker implements ProjectExistenceChecker {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async exists(projectId: string): Promise<boolean> {
    const rows: unknown = await this.dataSource.query(
      'SELECT 1 FROM projects WHERE id = $1 LIMIT 1',
      [projectId],
    );

    return Array.isArray(rows) && rows.length > 0;
  }
}
