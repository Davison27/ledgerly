import { deriveEffectiveStatus } from './effective-status';

describe('deriveEffectiveStatus', () => {
  it('returns overdue when pending and dueDate is before today', () => {
    expect(deriveEffectiveStatus('pending', '2026-07-01', '2026-07-18')).toBe('overdue');
  });

  it('keeps pending when dueDate is today', () => {
    expect(deriveEffectiveStatus('pending', '2026-07-18', '2026-07-18')).toBe('pending');
  });

  it('keeps pending when dueDate is in the future', () => {
    expect(deriveEffectiveStatus('pending', '2026-08-01', '2026-07-18')).toBe('pending');
  });

  it('keeps pending when dueDate is null', () => {
    expect(deriveEffectiveStatus('pending', null, '2026-07-18')).toBe('pending');
  });

  it('never overrides paid, even when dueDate is in the past', () => {
    expect(deriveEffectiveStatus('paid', '2020-01-01', '2026-07-18')).toBe('paid');
  });

  it('keeps overdue as overdue when dueDate is in the past', () => {
    expect(deriveEffectiveStatus('overdue', '2020-01-01', '2026-07-18')).toBe('overdue');
  });

  it('keeps overdue as overdue when dueDate is null', () => {
    expect(deriveEffectiveStatus('overdue', null, '2026-07-18')).toBe('overdue');
  });
});
