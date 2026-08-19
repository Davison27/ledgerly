import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxClientProfilePrimitives } from '../../domain/tax-client-profile';
import { TaxClientProfileRepository } from '../../domain/tax-client-profile.repository';
import { TaxClientProfileOrmEntity } from './tax-client-profile.orm-entity';
import { getListLimit, ListLimitExceededException } from '../../../../shared/infrastructure/list-limit';

function toPrimitives(orm: TaxClientProfileOrmEntity): TaxClientProfilePrimitives {
  return {
    id: orm.id,
    projectId: orm.projectId,
    countryCode: orm.countryCode as TaxClientProfilePrimitives['countryCode'],
    regionCode: orm.regionCode,
    entityType: orm.entityType as TaxClientProfilePrimitives['entityType'],
    fiscalYearStartMonth: orm.fiscalYearStartMonth,
    timezone: orm.timezone,
    enabled: orm.enabled,
    obligationKeys: [...orm.obligationKeys],
  };
}

@Injectable()
export class TypeOrmTaxClientProfileRepository implements TaxClientProfileRepository {
  constructor(
    @InjectRepository(TaxClientProfileOrmEntity)
    private readonly repository: Repository<TaxClientProfileOrmEntity>,
  ) {}

  async findAll(): Promise<TaxClientProfilePrimitives[]> {
    const limit = getListLimit('MAX_LIST_ITEMS', 500);
    const orms = await this.repository.find({ order: { projectId: 'ASC' }, take: limit + 1 });

    if (orms.length > limit) throw new ListLimitExceededException(limit, 'Tax client profiles');

    return orms.map(toPrimitives);
  }

  async findByProjectId(projectId: string): Promise<TaxClientProfilePrimitives | null> {
    const orm = await this.repository.findOne({ where: { projectId } });
    return orm ? toPrimitives(orm) : null;
  }

  async save(profile: TaxClientProfilePrimitives): Promise<void> {
    const orm = new TaxClientProfileOrmEntity();
    orm.id = profile.id;
    orm.projectId = profile.projectId;
    orm.countryCode = profile.countryCode;
    orm.regionCode = profile.regionCode;
    orm.entityType = profile.entityType;
    orm.fiscalYearStartMonth = profile.fiscalYearStartMonth;
    orm.timezone = profile.timezone;
    orm.enabled = profile.enabled;
    orm.obligationKeys = [...profile.obligationKeys];
    await this.repository.save(orm);
  }
}
