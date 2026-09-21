import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProjectOrmEntity } from '../../../projects/infrastructure/persistence/project.orm-entity';
import { GeneratedTaxDeadline, TaxDeadlineView } from '../../domain/tax-deadline';
import { TaxDeadlineFilter, TaxDeadlineRepository } from '../../domain/tax-deadline.repository';
import { TaxDeadlineOccurrenceOrmEntity } from './tax-deadline-occurrence.orm-entity';
import { getListLimit, ListLimitExceededException } from '../../../../shared/infrastructure/list-limit';
import { findTaxObligation } from '../../domain/tax-obligation-catalog';

function toEntity(deadline: GeneratedTaxDeadline): TaxDeadlineOccurrenceOrmEntity {
  const orm = new TaxDeadlineOccurrenceOrmEntity();
  orm.projectId = deadline.projectId;
  orm.obligationKey = deadline.obligationKey;
  orm.periodStart = deadline.periodStart;
  orm.periodEnd = deadline.periodEnd;
  orm.startDate = deadline.startDate;
  orm.endDate = deadline.endDate;
  orm.dueDate = deadline.dueDate;
  orm.status = deadline.status;
  return orm;
}

@Injectable()
export class TypeOrmTaxDeadlineRepository implements TaxDeadlineRepository {
  constructor(
    @InjectRepository(TaxDeadlineOccurrenceOrmEntity)
    private readonly repository: Repository<TaxDeadlineOccurrenceOrmEntity>,
    @InjectRepository(ProjectOrmEntity)
    private readonly projects: Repository<ProjectOrmEntity>,
  ) {}

  async upsert(deadline: GeneratedTaxDeadline): Promise<void> {
    await this.repository.upsert(toEntity(deadline), [
      'projectId',
      'obligationKey',
      'periodStart',
      'periodEnd',
    ]);
  }

  async findByFilter(filter: TaxDeadlineFilter): Promise<TaxDeadlineView[]> {
    const limit = getListLimit('MAX_LIST_ITEMS', 500);
    const query = this.repository
      .createQueryBuilder('deadline')
      .where('deadline.start_date <= :to', { to: filter.to })
      .andWhere('deadline.end_date >= :from', { from: filter.from });

    if (filter.projectId) {
      query.andWhere('deadline.project_id = :projectId', { projectId: filter.projectId });
    }

    if (filter.obligationKeys && filter.obligationKeys.length > 0) {
      query.andWhere('deadline.obligation_key IN (:...obligationKeys)', {
        obligationKeys: filter.obligationKeys,
      });
    }

    const orms = await query
      .orderBy('deadline.start_date', 'ASC')
      .addOrderBy('deadline.obligation_key', 'ASC')
      .addOrderBy('deadline.id', 'ASC')
      .take(limit + 1)
      .getMany();

    if (orms.length > limit) throw new ListLimitExceededException(limit, 'Tax deadlines');

    if (orms.length === 0) return [];

    const projectIds = [...new Set(orms.map((orm) => orm.projectId))];
    const projects = await this.projects.find({
      where: { id: In(projectIds) },
      select: { id: true, name: true, code: true, color: true },
    });
    const projectsById = new Map(projects.map((project) => [project.id, project]));

    return orms.flatMap((orm) => {
      const project = projectsById.get(orm.projectId);
      const definition = findTaxObligation(orm.obligationKey);
      if (!project || !definition) return [];

      return [
        {
          id: orm.id,
          projectId: orm.projectId,
          obligationKey: orm.obligationKey,
          code: definition.code,
          category: definition.category,
          periodStart: orm.periodStart,
          periodEnd: orm.periodEnd,
          startDate: orm.startDate,
          endDate: orm.endDate,
          dueDate: orm.dueDate,
          status: orm.status as TaxDeadlineView['status'],
          rule: definition.rule,
          sourceUrl: definition.sourceUrl,
          sourceVersion: definition.sourceVersion,
          projectName: project.name,
          projectCode: project.code,
          projectColor: project.color,
        },
      ];
    });
  }
}
