export type TaxSourceFormat = 'ical';

export interface TaxSourceDefinition {
  key: string;
  countryCode: 'ES';
  label: string;
  format: TaxSourceFormat;
  sourceUrl: string;
  feedUrl: string;
}

const AEAT_CALENDAR_URL =
  'https://sede.agenciatributaria.gob.es/Sede/calendario-contribuyente.html';

export const TAX_SOURCE_CATALOG: readonly TaxSourceDefinition[] = [
  {
    key: 'es-aeat-iva',
    countryCode: 'ES',
    label: 'AEAT · IVA',
    format: 'ical',
    sourceUrl: AEAT_CALENDAR_URL,
    feedUrl:
      'https://www.google.com/calendar/ical/517mcuhcis0lldnp9b7c0nk2q8%40group.calendar.google.com/public/basic.ics',
  },
  {
    key: 'es-aeat-renta',
    countryCode: 'ES',
    label: 'AEAT · Renta',
    format: 'ical',
    sourceUrl: AEAT_CALENDAR_URL,
    feedUrl: 'https://www.google.com/calendar/ical/invitado2aeat%40gmail.com/public/basic.ics',
  },
  {
    key: 'es-aeat-renta-sociedades',
    countryCode: 'ES',
    label: 'AEAT · Renta y Sociedades',
    format: 'ical',
    sourceUrl: AEAT_CALENDAR_URL,
    feedUrl:
      'https://www.google.com/calendar/ical/aio2b0s64q65r7v87j5ma8fvog%40group.calendar.google.com/public/basic.ics',
  },
];

export function findTaxSource(key: string): TaxSourceDefinition | undefined {
  return TAX_SOURCE_CATALOG.find((source) => source.key === key);
}
