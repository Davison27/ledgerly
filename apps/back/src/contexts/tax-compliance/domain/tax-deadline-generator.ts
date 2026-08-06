import { TaxClientProfilePrimitives } from './tax-client-profile';
import { TaxObligationDefinition } from './tax-obligation-catalog';
import { GeneratedTaxDeadline } from './tax-deadline';

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

function parseDate(value: string): CalendarDate {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

function formatDate({ year, month, day }: CalendarDate): string {
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}`;
}

function dateValue(date: CalendarDate): number {
  return Date.UTC(date.year, date.month - 1, date.day);
}

function addDays(value: string, days: number): string {
  const date = parseDate(value);
  const result = new Date(Date.UTC(date.year, date.month - 1, date.day));
  result.setUTCDate(result.getUTCDate() + days);
  return formatDate({
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: result.getUTCDate(),
  });
}

function adjustToBusinessDay(value: string): string {
  const date = parseDate(value);
  const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
  if (weekday === 0) return addDays(value, 1);
  if (weekday === 6) return addDays(value, 2);
  return value;
}

function quarterDates(
  periodYear: number,
  quarter: number,
): { start: string; end: string; due: string } {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const nextMonth = endMonth === 12 ? 1 : endMonth + 1;
  const nextYear = endMonth === 12 ? periodYear + 1 : periodYear;
  const lastDay = new Date(Date.UTC(nextYear, nextMonth - 1, 0)).getUTCDate();

  return {
    start: formatDate({ year: periodYear, month: startMonth, day: 1 }),
    end: formatDate({ year: periodYear, month: endMonth, day: lastDay }),
    due: '',
  };
}

function inRange(startDate: string, endDate: string, from: string, to: string): boolean {
  return (
    dateValue(parseDate(startDate)) <= dateValue(parseDate(to)) &&
    dateValue(parseDate(endDate)) >= dateValue(parseDate(from))
  );
}

function makeQuarterlyDeadline(
  profile: TaxClientProfilePrimitives,
  definition: TaxObligationDefinition,
  periodYear: number,
  quarter: number,
): GeneratedTaxDeadline {
  if (definition.rule.kind !== 'quarterly') {
    throw new Error('tax obligation is not quarterly');
  }

  const period = quarterDates(periodYear, quarter);
  const dueMonth = quarter === 1 ? 4 : quarter === 2 ? 7 : quarter === 3 ? 10 : 1;
  const dueYear = quarter === 4 ? periodYear + 1 : periodYear;
  const due = adjustToBusinessDay(
    formatDate({
      year: dueYear,
      month: dueMonth,
      day: quarter === 4 ? definition.rule.fourthQuarterDueDay : definition.rule.dueDay,
    }),
  );

  return {
    occurrenceKey: `${profile.projectId}:${definition.key}:${period.start}`,
    projectId: profile.projectId,
    obligationKey: definition.key,
    code: definition.code,
    title: `${definition.name} · T${quarter} ${periodYear}`,
    description: definition.description,
    category: definition.category,
    periodStart: period.start,
    periodEnd: period.end,
    startDate: due,
    endDate: due,
    dueDate: due,
    status: 'pending',
    sourceUrl: definition.sourceUrl,
    sourceVersion: definition.sourceVersion,
  };
}

function makeAnnualCampaignDeadline(
  profile: TaxClientProfilePrimitives,
  definition: TaxObligationDefinition,
  taxYear: number,
): GeneratedTaxDeadline {
  if (definition.rule.kind !== 'annual-campaign') {
    throw new Error('tax obligation is not annual campaign');
  }

  const startDate = formatDate({
    year: taxYear + 1,
    month: definition.rule.campaignStartMonth,
    day: definition.rule.campaignStartDay,
  });
  const endDate = adjustToBusinessDay(
    formatDate({
      year: taxYear + 1,
      month: definition.rule.campaignEndMonth,
      day: definition.rule.campaignEndDay,
    }),
  );

  return {
    occurrenceKey: `${profile.projectId}:${definition.key}:${taxYear}`,
    projectId: profile.projectId,
    obligationKey: definition.key,
    code: definition.code,
    title: `${definition.name} · ${taxYear}`,
    description: definition.description,
    category: definition.category,
    periodStart: `${taxYear}-01-01`,
    periodEnd: `${taxYear}-12-31`,
    startDate,
    endDate,
    dueDate: endDate,
    status: 'pending',
    sourceUrl: definition.sourceUrl,
    sourceVersion: definition.sourceVersion,
  };
}

export function generateTaxDeadlines(
  profile: TaxClientProfilePrimitives,
  definition: TaxObligationDefinition,
  from: string,
  to: string,
): GeneratedTaxDeadline[] {
  const fromYear = parseDate(from).year;
  const toYear = parseDate(to).year;
  const deadlines: GeneratedTaxDeadline[] = [];

  if (definition.rule.kind === 'quarterly') {
    for (let periodYear = fromYear - 1; periodYear <= toYear; periodYear += 1) {
      for (let quarter = 1; quarter <= 4; quarter += 1) {
        const deadline = makeQuarterlyDeadline(profile, definition, periodYear, quarter);
        if (inRange(deadline.startDate, deadline.endDate, from, to)) deadlines.push(deadline);
      }
    }
  } else {
    for (let taxYear = fromYear - 1; taxYear <= toYear; taxYear += 1) {
      const deadline = makeAnnualCampaignDeadline(profile, definition, taxYear);
      if (inRange(deadline.startDate, deadline.endDate, from, to)) deadlines.push(deadline);
    }
  }

  return deadlines;
}
