import { diffTaxSourceEvents } from '../../domain/tax-source-event';
import { parseIcalEvents } from './ical-parser';

const CALENDAR = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'UID:event-1',
  'DTSTART;VALUE=DATE:20260420',
  'DTEND;VALUE=DATE:20260421',
  'SUMMARY:Modelo 303\\, IVA',
  'DESCRIPTION:Primera línea\\nsegunda línea',
  'LAST-MODIFIED:20251216T120000Z',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:event-2',
  'DTSTART;VALUE=DATE:20260630',
  'SUMMARY:Campaña de Renta',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

describe('parseIcalEvents', () => {
  it('parses date fields and unescapes folded iCalendar values', () => {
    const events = parseIcalEvents(CALENDAR);

    expect(events).toEqual([
      {
        uid: 'event-1',
        summary: 'Modelo 303, IVA',
        description: 'Primera línea\nsegunda línea',
        startDate: '2026-04-20',
        endDate: '2026-04-21',
        lastModified: '2025-12-16T12:00:00.000Z',
      },
      {
        uid: 'event-2',
        summary: 'Campaña de Renta',
        description: null,
        startDate: '2026-06-30',
        endDate: null,
        lastModified: null,
      },
    ]);
  });

  it('rejects content that is not an iCalendar document', () => {
    expect(() => parseIcalEvents('<html>not a calendar</html>')).toThrow(
      'The source is not an iCalendar document',
    );
  });
});

describe('diffTaxSourceEvents', () => {
  it('reports added, removed and modified events by UID', () => {
    const [before] = parseIcalEvents(CALENDAR);
    const after = parseIcalEvents(
      CALENDAR.replace('20260420', '20260421').replace('UID:event-2', 'UID:event-3'),
    );

    const changes = diffTaxSourceEvents([before, ...parseIcalEvents(CALENDAR).slice(1)], after);

    expect(changes).toEqual([
      expect.objectContaining({ kind: 'modified', uid: 'event-1' }),
      expect.objectContaining({ kind: 'removed', uid: 'event-2' }),
      expect.objectContaining({ kind: 'added', uid: 'event-3' }),
    ]);
  });
});
