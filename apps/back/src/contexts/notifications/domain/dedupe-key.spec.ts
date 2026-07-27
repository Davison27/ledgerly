import { buildDedupeKey } from './dedupe-key';
import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';

describe('buildDedupeKey', () => {
  it('joins the type and a single part with a colon', () => {
    expect(buildDedupeKey('document_overdue', 'doc-1')).toBe('document_overdue:doc-1');
  });

  it('joins the type and several parts with a colon', () => {
    expect(buildDedupeKey('schedule_event_upcoming', 'event-1', '2026-07-20')).toBe(
      'schedule_event_upcoming:event-1:2026-07-20',
    );
  });

  it('throws when a part is empty', () => {
    expect(() => buildDedupeKey('document_overdue', '')).toThrow(InvalidValueException);
  });

  it('throws when the type has no parts and is otherwise valid', () => {
    expect(buildDedupeKey('document_incomplete', 'doc-1')).toBe('document_incomplete:doc-1');
  });

  it('throws when a part contains a colon', () => {
    expect(() => buildDedupeKey('document_overdue', 'doc:1')).toThrow(InvalidValueException);
  });
});
