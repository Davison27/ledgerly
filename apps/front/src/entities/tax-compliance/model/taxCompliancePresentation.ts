import type { TaxObligationRule } from '../api/types';

type TaxComplianceTranslator = (key: string) => string;

export interface TaxDeadlinePresentationInput {
  obligationKey: string;
  periodStart: string;
  rule: TaxObligationRule;
}

function obligationPath(obligationKey: string, field: 'name' | 'description'): string {
  return `workspace.taxCompliance.obligations.${obligationKey}.${field}`;
}

export function formatTaxObligationName(
  t: TaxComplianceTranslator,
  obligationKey: string,
): string {
  return t(obligationPath(obligationKey, 'name'));
}

export function formatTaxObligationDescription(
  t: TaxComplianceTranslator,
  obligationKey: string,
): string {
  return t(obligationPath(obligationKey, 'description'));
}

export function formatTaxSourceLabel(t: TaxComplianceTranslator, sourceKey: string): string {
  return t(`workspace.taxCompliance.sources.${sourceKey}.label`);
}

export function formatTaxDeadlineTitle(
  t: TaxComplianceTranslator,
  { obligationKey, periodStart, rule }: TaxDeadlinePresentationInput,
): string {
  const name = formatTaxObligationName(t, obligationKey);
  const year = periodStart.slice(0, 4);

  if (rule.kind === 'quarterly') {
    const quarter = Math.ceil(Number(periodStart.slice(5, 7)) / 3);
    return `${name} · T${quarter} ${year}`;
  }

  return `${name} · ${year}`;
}
