import { TaxComplianceSettingsPrimitives } from './tax-compliance-settings';

export const TAX_COMPLIANCE_SETTINGS_REPOSITORY = Symbol('TaxComplianceSettingsRepository');

export interface TaxComplianceSettingsRepository {
  find(): Promise<TaxComplianceSettingsPrimitives | null>;
  save(settings: TaxComplianceSettingsPrimitives): Promise<void>;
}
