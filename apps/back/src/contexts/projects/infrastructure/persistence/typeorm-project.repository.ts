import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../domain/project';
import { ProjectSummary } from '../../domain/project-summary';
import { ProjectDashboardRow, ProjectRepository } from '../../domain/project.repository';
import { ProjectOrmEntity } from './project.orm-entity';
import { ProjectMapper } from './project.mapper';

@Injectable()
export class TypeOrmProjectRepository implements ProjectRepository {
  private readonly mapper = new ProjectMapper();

  constructor(
    @InjectRepository(ProjectOrmEntity)
    private readonly repository: Repository<ProjectOrmEntity>,
  ) {}

  async findAllSummaries(): Promise<ProjectSummary[]> {
    const rows: ProjectSummary[] = await this.repository.manager.query(`
      SELECT p.id, p.name, p.code, p.image, p.is_demo AS "isDemo",
        COUNT(d.id)::int AS "documentCount",
        COUNT(d.id) FILTER (WHERE d.status = 'pendiente')::int AS "pendingCount"
      FROM projects p
      LEFT JOIN documents d ON d.project_id = p.id
      GROUP BY p.id, p.name, p.code, p.image, p.is_demo
      ORDER BY p.name ASC
    `);

    return rows;
  }

  async findSummaryById(id: string): Promise<ProjectSummary | null> {
    const rows: ProjectSummary[] = await this.repository.manager.query(
      `
      SELECT p.id, p.name, p.code, p.image, p.is_demo AS "isDemo",
        COUNT(d.id)::int AS "documentCount",
        COUNT(d.id) FILTER (WHERE d.status = 'pendiente')::int AS "pendingCount"
      FROM projects p
      LEFT JOIN documents d ON d.project_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, p.name, p.code, p.image, p.is_demo
      ORDER BY p.name ASC
    `,
      [id],
    );

    return rows.length > 0 ? rows[0] : null;
  }

  async findById(id: string): Promise<Project | null> {
    const orm = await this.repository.findOne({ where: { id } });

    return orm !== null ? this.mapper.toDomain(orm) : null;
  }

  async findByCode(code: string): Promise<Project | null> {
    const orm = await this.repository.findOne({ where: { code } });

    return orm !== null ? this.mapper.toDomain(orm) : null;
  }

  async save(project: Project): Promise<void> {
    await this.repository.save(this.mapper.toOrm(project));
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async findAllForDashboard(): Promise<ProjectDashboardRow[]> {
    const orms = await this.repository.find({
      select: {
        id: true,
        name: true,
        budget: true,
        currency: true,
      },
    });

    return orms.map((orm) => ({
      id: orm.id,
      name: orm.name,
      budget: orm.budget !== null ? Number(orm.budget) : null,
      currency: orm.currency,
    }));
  }
}
