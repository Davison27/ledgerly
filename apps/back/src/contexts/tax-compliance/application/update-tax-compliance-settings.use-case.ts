import { Inject, Injectable } from '@nestjs/common';
import {
  DEFAULT_TAX_COMPLIANCE_INTERNAL_LEAD_DAYS,
  TaxComplianceSettingsPrimitives,
} from '../domain/tax-compliance-settings';
import {
  TAX_COMPLIANCE_SETTINGS_REPOSITORY,
  TaxComplianceSettingsRepository,
} from '../domain/tax-compliance-settings.repository';

export interface UpdateTaxComplianceSettingsCommand {
  enabled?: boolean;
  internalLeadDays?: number;
}

@Injectable()
export class UpdateTaxComplianceSettingsUseCase {
  constructor(
    @Inject(TAX_COMPLIANCE_SETTINGS_REPOSITORY)
    private readonly repository: TaxComplianceSettingsRepository,
  ) {}

  async execute(
    command: UpdateTaxComplianceSettingsCommand,
  ): Promise<TaxComplianceSettingsPrimitives> {
    const current = (await this.repository.find()) ?? {
      enabled: false,
      internalLeadDays: DEFAULT_TAX_COMPLIANCE_INTERNAL_LEAD_DAYS,
    };
    const next = {
      enabled: command.enabled ?? current.enabled,
      internalLeadDays: command.internalLeadDays ?? current.internalLeadDays,
    };

    await this.repository.save(next);
    return next;
  }
}
