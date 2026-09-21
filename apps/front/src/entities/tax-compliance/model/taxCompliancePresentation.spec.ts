import { describe, expect, it, vi } from 'vitest';
import {
  formatTaxDeadlineTitle,
  formatTaxObligationDescription,
  formatTaxObligationName,
  formatTaxSourceLabel,
} from './taxCompliancePresentation';

describe('tax compliance presentation', () => {
  it('formats quarterly deadlines from the stable obligation key and machine rule', () => {
    const translate = vi.fn((key: string) =>
      key.endsWith('.name') ? 'Form 303 · Quarterly VAT' : key,
    );

    expect(
      formatTaxDeadlineTitle(translate, {
        obligationKey: 'es-aeat-model-303-quarterly',
        periodStart: '2026-07-01',
        rule: { kind: 'quarterly', dueDay: 20, fourthQuarterDueDay: 30 },
      }),
    ).toBe('Form 303 · Quarterly VAT · T3 2026');
    expect(translate).toHaveBeenCalledWith(
      'workspace.taxCompliance.obligations.es-aeat-model-303-quarterly.name',
    );
  });

  it('formats annual deadlines without relying on API display fields', () => {
    const translate = vi.fn((key: string) =>
      key.endsWith('.name') ? 'Form 100 · Income tax' : key,
    );

    expect(
      formatTaxDeadlineTitle(translate, {
        obligationKey: 'es-aeat-model-100-annual',
        periodStart: '2026-01-01',
        rule: {
          kind: 'annual-campaign',
          campaignStartMonth: 4,
          campaignStartDay: 8,
          campaignEndMonth: 6,
          campaignEndDay: 30,
        },
      }),
    ).toBe('Form 100 · Income tax · 2026');
  });

  it('keeps obligation descriptions and source labels in the tax compliance namespace', () => {
    const translate = vi.fn((key: string) => key);

    expect(
      formatTaxObligationName(translate, 'es-aeat-model-111-quarterly'),
    ).toBe('workspace.taxCompliance.obligations.es-aeat-model-111-quarterly.name');
    expect(
      formatTaxObligationDescription(translate, 'es-aeat-model-111-quarterly'),
    ).toBe('workspace.taxCompliance.obligations.es-aeat-model-111-quarterly.description');
    expect(formatTaxSourceLabel(translate, 'es-aeat-iva')).toBe(
      'workspace.taxCompliance.sources.es-aeat-iva.label',
    );
  });
});
