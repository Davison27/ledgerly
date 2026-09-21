import { TaxEntityType } from './tax-client-profile';

export type TaxObligationRule =
  | {
      kind: 'quarterly';
      dueDay: number;
      fourthQuarterDueDay: number;
    }
  | {
      kind: 'annual-campaign';
      campaignStartMonth: number;
      campaignStartDay: number;
      campaignEndMonth: number;
      campaignEndDay: number;
    };

export interface TaxObligationDefinition {
  key: string;
  countryCode: 'ES';
  code: string;
  category: 'vat' | 'withholding' | 'income';
  eligibleEntityTypes: readonly TaxEntityType[];
  rule: TaxObligationRule;
  sourceUrl: string;
  sourceVersion: string;
}

const AEAT_CALENDAR_2026 =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026.html';

export const TAX_OBLIGATION_CATALOG: readonly TaxObligationDefinition[] = [
  {
    key: 'es-aeat-model-303-quarterly',
    countryCode: 'ES',
    code: '303',
    category: 'vat',
    eligibleEntityTypes: ['self_employed', 'company'],
    rule: { kind: 'quarterly', dueDay: 20, fourthQuarterDueDay: 30 },
    sourceUrl: AEAT_CALENDAR_2026,
    sourceVersion: 'AEAT-2026',
  },
  {
    key: 'es-aeat-model-111-quarterly',
    countryCode: 'ES',
    code: '111',
    category: 'withholding',
    eligibleEntityTypes: ['self_employed', 'company'],
    rule: { kind: 'quarterly', dueDay: 20, fourthQuarterDueDay: 20 },
    sourceUrl: AEAT_CALENDAR_2026,
    sourceVersion: 'AEAT-2026',
  },
  {
    key: 'es-aeat-model-115-quarterly',
    countryCode: 'ES',
    code: '115',
    category: 'withholding',
    eligibleEntityTypes: ['self_employed', 'company'],
    rule: { kind: 'quarterly', dueDay: 20, fourthQuarterDueDay: 20 },
    sourceUrl: AEAT_CALENDAR_2026,
    sourceVersion: 'AEAT-2026',
  },
  {
    key: 'es-aeat-model-100-annual',
    countryCode: 'ES',
    code: '100',
    category: 'income',
    eligibleEntityTypes: ['self_employed', 'individual'],
    rule: {
      kind: 'annual-campaign',
      campaignStartMonth: 4,
      campaignStartDay: 8,
      campaignEndMonth: 6,
      campaignEndDay: 30,
    },
    sourceUrl: AEAT_CALENDAR_2026,
    sourceVersion: 'AEAT-2026',
  },
];

export function findTaxObligation(key: string): TaxObligationDefinition | undefined {
  return TAX_OBLIGATION_CATALOG.find((obligation) => obligation.key === key);
}
