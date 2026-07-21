/**
 * Mirror of the canonical totals formula that lives in the backend's
 * `Invoice.create()` (see `docs/architecture/invoices.md` and D3 of the
 * products-and-invoice-lines plan): each line rounds `quantity * unitPrice` to
 * 2 decimals *before* summing (`taxBase = Σ round2(qty × price)`, never
 * `round2(Σ qty × price)`), `taxAmount`/`irpfAmount` apply the global rates,
 * and IRPF subtracts from the total. This is used only to preview totals
 * while the form is being filled in — what actually gets persisted and
 * printed is always the server's response, which repaints this preview after
 * a successful save.
 *
 * Canonical example (mirrored from the backend's
 * `invoice.spec.ts` test named "canonical example mirrored in
 * apps/front/src/features/invoices/totals.ts"):
 * lines = [{ qty: 2, price: 100 }, { qty: 1.5, price: 33.33 }], taxRate = 21,
 * irpfRate = 15 -> lineAmounts = [200, round2(49.995) = 50] -> taxBase = 250,
 * taxAmount = 52.5, irpfAmount = 37.5, total = 265.
 */

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
