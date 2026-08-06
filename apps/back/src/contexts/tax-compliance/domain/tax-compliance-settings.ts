export const TAX_COMPLIANCE_SETTINGS_ID = 'default';
export const DEFAULT_TAX_COMPLIANCE_INTERNAL_LEAD_DAYS = 7;

export interface TaxComplianceSettingsPrimitives {
  enabled: boolean;
  internalLeadDays: number;
}

export const DEFAULT_TAX_COMPLIANCE_SETTINGS: TaxComplianceSettingsPrimitives = {
  enabled: false,
  internalLeadDays: DEFAULT_TAX_COMPLIANCE_INTERNAL_LEAD_DAYS,
};
