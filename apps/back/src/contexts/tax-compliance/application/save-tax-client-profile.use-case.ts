import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectOrmEntity } from '../../projects/infrastructure/persistence/project.orm-entity';
import {
  TAX_CLIENT_PROFILE_REPOSITORY,
  TaxClientProfileRepository,
} from '../domain/tax-client-profile.repository';
import {
  TAX_COUNTRY_CODES,
  TAX_ENTITY_TYPES,
  TaxClientProfilePrimitives,
} from '../domain/tax-client-profile';
import { findTaxObligation } from '../domain/tax-obligation-catalog';

export interface SaveTaxClientProfileCommand {
  projectId: string;
  countryCode: string;
  regionCode?: string | null;
  entityType: string;
  fiscalYearStartMonth?: number;
  timezone?: string;
  enabled?: boolean;
  obligationKeys: string[];
}

@Injectable()
export class SaveTaxClientProfileUseCase {
  constructor(
    @Inject(TAX_CLIENT_PROFILE_REPOSITORY)
    private readonly repository: TaxClientProfileRepository,
    @InjectRepository(ProjectOrmEntity)
    private readonly projects: Repository<ProjectOrmEntity>,
  ) {}

  async execute(command: SaveTaxClientProfileCommand): Promise<TaxClientProfilePrimitives> {
    const project = await this.projects.findOne({ where: { id: command.projectId } });
    if (!project) throw new NotFoundException('Project not found');

    if (!TAX_COUNTRY_CODES.includes(command.countryCode as (typeof TAX_COUNTRY_CODES)[number])) {
      throw new BadRequestException('Unsupported tax country');
    }

    if (!TAX_ENTITY_TYPES.includes(command.entityType as (typeof TAX_ENTITY_TYPES)[number])) {
      throw new BadRequestException('Unsupported tax entity type');
    }

    const fiscalYearStartMonth = command.fiscalYearStartMonth ?? 1;
    if (fiscalYearStartMonth < 1 || fiscalYearStartMonth > 12) {
      throw new BadRequestException('Fiscal year start month must be between 1 and 12');
    }

    const obligationKeys = [...new Set(command.obligationKeys)];
    for (const key of obligationKeys) {
      const obligation = findTaxObligation(key);
      if (!obligation) throw new BadRequestException(`Unknown tax obligation: ${key}`);
      if (
        !obligation.eligibleEntityTypes.includes(
          command.entityType as (typeof TAX_ENTITY_TYPES)[number],
        )
      ) {
        throw new BadRequestException(
          `Tax obligation ${key} is not applicable to this entity type`,
        );
      }
    }

    const current = await this.repository.findByProjectId(command.projectId);
    const profile: TaxClientProfilePrimitives = {
      id: current?.id ?? randomUUID(),
      projectId: command.projectId,
      countryCode: command.countryCode as TaxClientProfilePrimitives['countryCode'],
      regionCode: command.regionCode?.trim() || null,
      entityType: command.entityType as TaxClientProfilePrimitives['entityType'],
      fiscalYearStartMonth,
      timezone: command.timezone?.trim() || 'Europe/Madrid',
      enabled: command.enabled ?? true,
      obligationKeys,
    };

    await this.repository.save(profile);
    return profile;
  }
}
