export interface InvoiceLineInput {
  unitPrice?: number | null;
  quantity?: number | null;
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
  const taxBase = round(
    lines.reduce((sum, line) => sum + round((line.quantity ?? 1) * (line.unitPrice ?? 0)), 0),
  );
  const taxAmount = round((taxBase * (taxRate ?? 0)) / 100);
  const irpfAmount = round((taxBase * (irpfRate ?? 0)) / 100);
  const total = round(taxBase + taxAmount - irpfAmount);

  return { taxBase, taxAmount, irpfAmount, total };
}
