import { Inject, Injectable } from '@nestjs/common';
import {
  DEFAULT_TAX_COMPLIANCE_SETTINGS,
  TaxComplianceSettingsPrimitives,
} from '../domain/tax-compliance-settings';
import {
  TAX_COMPLIANCE_SETTINGS_REPOSITORY,
  TaxComplianceSettingsRepository,
} from '../domain/tax-compliance-settings.repository';

@Injectable()
export class GetTaxComplianceSettingsUseCase {
  constructor(
    @Inject(TAX_COMPLIANCE_SETTINGS_REPOSITORY)
    private readonly repository: TaxComplianceSettingsRepository,
  ) {}

  async execute(): Promise<TaxComplianceSettingsPrimitives> {
    return (await this.repository.find()) ?? { ...DEFAULT_TAX_COMPLIANCE_SETTINGS };
  }
}
