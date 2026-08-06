import { generateTaxDeadlines } from './tax-deadline-generator';
import { findTaxObligation } from './tax-obligation-catalog';
import type { TaxClientProfilePrimitives } from './tax-client-profile';

const PROFILE: TaxClientProfilePrimitives = {
  id: 'profile-1',
  projectId: 'project-1',
  countryCode: 'ES',
  regionCode: 'MD',
  entityType: 'autonomo',
  fiscalYearStartMonth: 1,
  timezone: 'Europe/Madrid',
  enabled: true,
  obligationKeys: [],
};

describe('generateTaxDeadlines', () => {
  it('generates the quarterly VAT deadline for the selected period', () => {
    const definition = findTaxObligation('es-aeat-model-303-quarterly');

    expect(definition).toBeDefined();
    const deadlines = generateTaxDeadlines(PROFILE, definition!, '2026-04-01', '2026-04-30');

    expect(deadlines).toContainEqual(
      expect.objectContaining({
        occurrenceKey: 'project-1:es-aeat-model-303-quarterly:2026-01-01',
        periodStart: '2026-01-01',
        periodEnd: '2026-03-31',
        startDate: '2026-04-20',
        dueDate: '2026-04-20',
      }),
    );
  });

  it('uses the January deadline for fourth-quarter VAT', () => {
    const definition = findTaxObligation('es-aeat-model-303-quarterly');

    expect(definition).toBeDefined();
    const deadlines = generateTaxDeadlines(PROFILE, definition!, '2026-01-01', '2026-01-31');

    expect(deadlines).toContainEqual(
      expect.objectContaining({
        periodStart: '2025-10-01',
        periodEnd: '2025-12-31',
        startDate: '2026-01-30',
        dueDate: '2026-01-30',
      }),
    );
  });

  it('moves a weekend due date to the next business day', () => {
    const definition = findTaxObligation('es-aeat-model-111-quarterly');

    expect(definition).toBeDefined();
    const deadlines = generateTaxDeadlines(PROFILE, definition!, '2029-10-01', '2029-10-31');

    expect(deadlines).toContainEqual(
      expect.objectContaining({
        periodStart: '2029-07-01',
        startDate: '2029-10-22',
        dueDate: '2029-10-22',
      }),
    );
  });

  it('represents the annual income campaign as a date range', () => {
    const definition = findTaxObligation('es-aeat-model-100-annual');

    expect(definition).toBeDefined();
    const deadlines = generateTaxDeadlines(PROFILE, definition!, '2026-04-01', '2026-06-30');

    expect(deadlines).toContainEqual(
      expect.objectContaining({
        periodStart: '2025-01-01',
        periodEnd: '2025-12-31',
        startDate: '2026-04-08',
        endDate: '2026-06-30',
        dueDate: '2026-06-30',
      }),
    );
  });
});
