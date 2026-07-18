import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DemoProjectPurger } from '../../domain/demo-project-purger.port';

@Injectable()
export class TypeOrmDemoProjectPurger implements DemoProjectPurger {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async purgeDemoProjects(): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `DELETE FROM documents WHERE project_id IN (SELECT id FROM projects WHERE is_demo = true)`,
      );
      await manager.query(`DELETE FROM projects WHERE is_demo = true`);
    });
  }
}
