export const TAX_COUNTRY_CODES = ['ES'] as const;
export type TaxCountryCode = (typeof TAX_COUNTRY_CODES)[number];

export const TAX_ENTITY_TYPES = ['autonomo', 'sociedad', 'particular'] as const;
export type TaxEntityType = (typeof TAX_ENTITY_TYPES)[number];

export interface TaxClientProfilePrimitives {
  id: string;
  projectId: string;
  countryCode: TaxCountryCode;
  regionCode: string | null;
  entityType: TaxEntityType;
  fiscalYearStartMonth: number;
  timezone: string;
  enabled: boolean;
  obligationKeys: string[];
}
