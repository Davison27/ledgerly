import { deriveEffectiveStatus } from './effective-status';

describe('deriveEffectiveStatus', () => {
  it('returns vencido when pendiente and dueDate is before today', () => {
    expect(deriveEffectiveStatus('pendiente', '2026-07-01', '2026-07-18')).toBe('vencido');
  });

  it('keeps pendiente when dueDate is today', () => {
    expect(deriveEffectiveStatus('pendiente', '2026-07-18', '2026-07-18')).toBe('pendiente');
  });

  it('keeps pendiente when dueDate is in the future', () => {
    expect(deriveEffectiveStatus('pendiente', '2026-08-01', '2026-07-18')).toBe('pendiente');
  });

  it('keeps pendiente when dueDate is null', () => {
    expect(deriveEffectiveStatus('pendiente', null, '2026-07-18')).toBe('pendiente');
  });

  it('never overrides pagado, even when dueDate is in the past', () => {
    expect(deriveEffectiveStatus('pagado', '2020-01-01', '2026-07-18')).toBe('pagado');
  });

  it('keeps vencido as vencido when dueDate is in the past', () => {
    expect(deriveEffectiveStatus('vencido', '2020-01-01', '2026-07-18')).toBe('vencido');
  });

  it('keeps vencido as vencido when dueDate is null', () => {
    expect(deriveEffectiveStatus('vencido', null, '2026-07-18')).toBe('vencido');
  });
});
