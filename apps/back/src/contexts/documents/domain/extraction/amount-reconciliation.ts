const TOLERANCE = 0.02;
const MAX_POOL_SIZE = 40;
const MAX_VAT_LINES = 3;

export interface AmountTotalCandidate {
  value: number;
  priority: number;
}

export interface VatLineCandidate {
  rate?: number;
  amount?: number;
  base?: number;
}

export interface IrpfCandidate {
  rate?: number;
  amount?: number;
}

export interface AmountCandidates {
  totals: AmountTotalCandidate[];
  bases: number[];
  vatLines: VatLineCandidate[];
  irpf?: IrpfCandidate;
  pool: number[];
}

export interface ReconciledAmounts {
  amount?: number;
  taxBase: number;
  taxAmount: number;
  taxRate?: number;
  irpfRate?: number;
  irpfAmount?: number;
  rates: number[];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function preparePool(pool: number[]): number[] {
  const deduped = Array.from(new Set(pool.map((value) => Math.abs(value)).filter((value) => value > 0)));
  return deduped.slice(0, MAX_POOL_SIZE);
}

function reconciles(base: number, rate: number, amount: number): boolean {
  return base > 0 && amount > 0 && Math.abs((base * rate) / 100 - amount) <= TOLERANCE;
}

function resolveVatLine(line: VatLineCandidate, bases: number[], pool: number[]): { base: number; amount: number } | undefined {
  if (line.rate == null) {
    const base = line.base ?? (bases.length === 1 ? bases[0] : undefined);
    return base != null && line.amount != null ? { base, amount: line.amount } : undefined;
  }

  const rate = line.rate;

  if (line.base != null && line.amount != null) {
    return reconciles(line.base, rate, line.amount) ? { base: line.base, amount: line.amount } : undefined;
  }

  if (line.base != null) {
    const amount = pool.find((candidate) => reconciles(line.base as number, rate, candidate));
    if (amount != null) return { base: line.base, amount };
  }

  if (line.amount != null) {
    const base = [...bases, ...pool].find((candidate) => reconciles(candidate, rate, line.amount as number));
    if (base != null) return { base, amount: line.amount };
  }

  for (const base of [...bases, ...pool]) {
    const amount = pool.find((candidate) => reconciles(base, rate, candidate));
    if (amount != null) return { base, amount };
  }
  return undefined;
}

function reconcileVatLines(
  vatLines: VatLineCandidate[],
  bases: number[],
  pool: number[],
): { taxBase: number; taxAmount: number; rates: number[] } | undefined {
  const limited = vatLines.slice(0, MAX_VAT_LINES);
  if (limited.length === 0) return undefined;

  let taxBase = 0;
  let taxAmount = 0;
  const rates: number[] = [];

  for (const line of limited) {
    const resolved = resolveVatLine(line, bases, pool);
    if (!resolved) return undefined;
    taxBase += resolved.base;
    taxAmount += resolved.amount;
    if (line.rate != null) rates.push(line.rate);
  }

  return { taxBase, taxAmount, rates };
}

function resolveIrpf(irpf: IrpfCandidate | undefined, taxBase: number, pool: number[]): number | undefined {
  if (!irpf) return undefined;
  if (irpf.amount != null) return Math.abs(irpf.amount);
  if (irpf.rate == null) return undefined;

  const expected = (taxBase * irpf.rate) / 100;
  return pool.find((candidate) => Math.abs(candidate - expected) <= TOLERANCE);
}

function pickTotal(totals: AmountTotalCandidate[], payable: number): number | undefined {
  const byPriorityDesc = [...totals].sort((a, b) => b.priority - a.priority);
  return byPriorityDesc.find((candidate) => Math.abs(candidate.value - payable) <= TOLERANCE)?.value;
}

export function reconcileAmounts(candidates: AmountCandidates): ReconciledAmounts | null {
  const pool = preparePool(candidates.pool);
  const vatResult = reconcileVatLines(candidates.vatLines, candidates.bases, pool);
  if (!vatResult) return null;

  const irpfAmount = resolveIrpf(candidates.irpf, vatResult.taxBase, pool);
  const irpfRate = irpfAmount != null ? candidates.irpf?.rate : undefined;
  const payable = vatResult.taxBase + vatResult.taxAmount - (irpfAmount ?? 0);

  const amount =
    candidates.totals.length > 0
      ? pickTotal(candidates.totals, payable)
      : pool.find((value) => Math.abs(value - payable) <= TOLERANCE);

  return {
    amount,
    taxBase: round2(vatResult.taxBase),
    taxAmount: round2(vatResult.taxAmount),
    taxRate: vatResult.rates.length === 1 ? vatResult.rates[0] : undefined,
    irpfRate,
    irpfAmount,
    rates: vatResult.rates,
  };
}
