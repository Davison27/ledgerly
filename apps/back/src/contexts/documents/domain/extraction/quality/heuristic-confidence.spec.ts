import { computeHeuristicConfidence } from './heuristic-confidence';
import { InvoiceFields } from '../invoice-fields';

describe('computeHeuristicConfidence', () => {
  it('is low when amount is missing', () => {
    expect(computeHeuristicConfidence({})).toBe('low');
  });

  it('is low when base, VAT, and amount do not reconcile', () => {
    const fields: InvoiceFields = { amount: 1000, taxBase: 500, taxAmount: 50 };

    expect(computeHeuristicConfidence(fields)).toBe('low');
  });

  it('is high when the arithmetic reconciles, the tax id is checksum-valid, and the invoice number and date are present', () => {
    const fields: InvoiceFields = {
      amount: 1210,
      taxBase: 1000,
      taxAmount: 210,
      issuerTaxId: 'B12345674',
      invoiceNumber: 'FA-2026-0088',
      date: '2026-03-15',
    };

    expect(computeHeuristicConfidence(fields)).toBe('high');
  });

  it('is high when arithmetic reconciles after subtracting IRPF', () => {
    const fields: InvoiceFields = {
      amount: 2120,
      taxBase: 2000,
      taxAmount: 420,
      irpfAmount: 300,
      issuerTaxId: 'B12345674',
      invoiceNumber: 'FA-2026-0400',
      date: '2026-07-05',
    };

    expect(computeHeuristicConfidence(fields)).toBe('high');
  });

  it('is partial when it reconciles but the tax id checksum is invalid', () => {
    const fields: InvoiceFields = {
      amount: 1210,
      taxBase: 1000,
      taxAmount: 210,
      issuerTaxId: 'B12345678',
      invoiceNumber: 'FA-2026-0088',
      date: '2026-03-15',
    };

    expect(computeHeuristicConfidence(fields)).toBe('partial');
  });

  it('is partial when it reconciles but the invoice number is missing', () => {
    const fields: InvoiceFields = {
      amount: 1210,
      taxBase: 1000,
      taxAmount: 210,
      issuerTaxId: 'B12345674',
      date: '2026-03-15',
    };

    expect(computeHeuristicConfidence(fields)).toBe('partial');
  });

  it('is partial when there is a supporting field but no base/VAT to reconcile', () => {
    const fields: InvoiceFields = { amount: 100, issuerTaxId: 'B12345678' };

    expect(computeHeuristicConfidence(fields)).toBe('partial');
  });

  it('is low when only the amount is present with no supporting field', () => {
    const fields: InvoiceFields = { amount: 100 };

    expect(computeHeuristicConfidence(fields)).toBe('low');
  });
});
