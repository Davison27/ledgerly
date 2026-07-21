/**
 * Mirror of the canonical totals formula that lives in the backend's
 * `Invoice.create()` (D3 of the invoice-generator-poc plan): `taxBase` is the
 * sum of the line prices, `taxAmount`/`irpfAmount` apply the global rates, and
 * IRPF subtracts from the total. This is used only to preview totals while the
 * form is being filled in — what actually gets persisted and printed is always
 * the server's response, which repaints this preview after a successful save.
 */

export interface InvoiceLineInput {
  unitPrice?: number | null;
}

export interface InvoiceTotals {
  taxBase: number;
  taxAmount: number;
  irpfAmount: number;
  total: number;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeInvoiceTotals(
  lines: InvoiceLineInput[],
  taxRate: number | null | undefined,
  irpfRate: number | null | undefined,
): InvoiceTotals {
  const taxBase = round(lines.reduce((sum, line) => sum + (line.unitPrice ?? 0), 0));
  const taxAmount = round((taxBase * (taxRate ?? 0)) / 100);
  const irpfAmount = round((taxBase * (irpfRate ?? 0)) / 100);
  const total = round(taxBase + taxAmount - irpfAmount);

  return { taxBase, taxAmount, irpfAmount, total };
}
