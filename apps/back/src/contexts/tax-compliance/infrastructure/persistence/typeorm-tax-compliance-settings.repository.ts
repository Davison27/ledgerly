import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DEFAULT_TAX_COMPLIANCE_SETTINGS,
  TAX_COMPLIANCE_SETTINGS_ID,
  TaxComplianceSettingsPrimitives,
} from '../../domain/tax-compliance-settings';
import { TaxComplianceSettingsRepository } from '../../domain/tax-compliance-settings.repository';
import { TaxComplianceSettingsOrmEntity } from './tax-compliance-settings.orm-entity';

@Injectable()
export class TypeOrmTaxComplianceSettingsRepository implements TaxComplianceSettingsRepository {
  constructor(
    @InjectRepository(TaxComplianceSettingsOrmEntity)
    private readonly repository: Repository<TaxComplianceSettingsOrmEntity>,
  ) {}

  async find(): Promise<TaxComplianceSettingsPrimitives | null> {
    const orm = await this.repository.findOne({ where: { id: TAX_COMPLIANCE_SETTINGS_ID } });
    if (!orm) return null;

    return {
      enabled: orm.enabled,
      internalLeadDays: orm.internalLeadDays,
    };
  }

  async save(settings: TaxComplianceSettingsPrimitives): Promise<void> {
    const orm = new TaxComplianceSettingsOrmEntity();
    orm.id = TAX_COMPLIANCE_SETTINGS_ID;
    orm.enabled = settings.enabled;
    orm.internalLeadDays = settings.internalLeadDays;
    orm.updatedAt = new Date();
    await this.repository.save(orm);
  }

  static defaults(): TaxComplianceSettingsPrimitives {
    return { ...DEFAULT_TAX_COMPLIANCE_SETTINGS };
  }
}
