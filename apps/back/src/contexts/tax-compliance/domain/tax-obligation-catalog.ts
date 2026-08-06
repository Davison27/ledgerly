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
  name: string;
  description: string;
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
    name: 'Modelo 303 · IVA trimestral',
    description: 'Autoliquidación trimestral del impuesto sobre el valor añadido.',
    category: 'vat',
    eligibleEntityTypes: ['autonomo', 'sociedad'],
    rule: { kind: 'quarterly', dueDay: 20, fourthQuarterDueDay: 30 },
    sourceUrl: AEAT_CALENDAR_2026,
    sourceVersion: 'AEAT-2026',
  },
  {
    key: 'es-aeat-model-111-quarterly',
    countryCode: 'ES',
    code: '111',
    name: 'Modelo 111 · Retenciones',
    description: 'Retenciones e ingresos a cuenta del IRPF trimestrales.',
    category: 'withholding',
    eligibleEntityTypes: ['autonomo', 'sociedad'],
    rule: { kind: 'quarterly', dueDay: 20, fourthQuarterDueDay: 20 },
    sourceUrl: AEAT_CALENDAR_2026,
    sourceVersion: 'AEAT-2026',
  },
  {
    key: 'es-aeat-model-115-quarterly',
    countryCode: 'ES',
    code: '115',
    name: 'Modelo 115 · Alquileres',
    description: 'Retenciones e ingresos a cuenta sobre alquileres urbanos.',
    category: 'withholding',
    eligibleEntityTypes: ['autonomo', 'sociedad'],
    rule: { kind: 'quarterly', dueDay: 20, fourthQuarterDueDay: 20 },
    sourceUrl: AEAT_CALENDAR_2026,
    sourceVersion: 'AEAT-2026',
  },
  {
    key: 'es-aeat-model-100-annual',
    countryCode: 'ES',
    code: '100',
    name: 'Modelo 100 · Renta',
    description: 'Campaña anual del impuesto sobre la renta de las personas físicas.',
    category: 'income',
    eligibleEntityTypes: ['autonomo', 'particular'],
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
