import {
  CREATABLE_DOCUMENT_TYPES,
  CreatableDocumentType,
} from '../../contexts/documents/domain/document-type';
import { DocumentDirection } from '../../contexts/documents/domain/document-direction';
import { DocumentStatus } from '../../contexts/documents/domain/document-status';

const NAMES: Record<CreatableDocumentType, string[]> = {
  factura: [
    'Suministros Norte',
    'Transporte Rápido SL',
    'Materiales García',
    'Servicios Cloud SA',
    'Oficina Total',
    'Distribuciones Ebro',
  ],
  impuesto: [
    'IVA Trimestre 1',
    'IRPF Enero',
    'IVA Trimestre 2',
    'Retenciones Q1',
    'Impuesto Sociedades',
    'IVA Trimestre 3',
  ],
};

const TYPES = [...CREATABLE_DOCUMENT_TYPES];
const STATUSES: DocumentStatus[] = ['pagado', 'pendiente', 'vencido'];
const ISSUER_TAX_IDS: Record<string, string> = {
  'Suministros Norte': 'B10203040',
  'Transporte Rápido SL': 'B20304050',
  'Materiales García': 'B30405060',
  'Servicios Cloud SA': 'B40506070',
  'Oficina Total': 'B50607080',
  'Distribuciones Ebro': 'B60708090',
};

export interface DocumentSeed {
  name: string;
  type: CreatableDocumentType;
  month: number;
  date: string;
  amount: number;
  status: DocumentStatus;
  issuerName: string | null;
  issuerTaxId: string | null;
  invoiceNumber: string | null;
  dueDate: string | null;
  taxBase: number | null;
  taxRate: number | null;
  taxAmount: number | null;
  irpfRate: number | null;
  irpfAmount: number | null;
  currency: 'EUR' | 'USD' | 'GBP';
  direction: DocumentDirection;
  staffMemberId: null;
}

function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function generateDocuments(seed: number): DocumentSeed[] {
  const documents: DocumentSeed[] = [];

  for (let index = 0; index < 20; index++) {
    const type = TYPES[(index + seed) % TYPES.length];
    const names = NAMES[type];
    const name = names[index % names.length];
    const month = ((index * 2 + seed) % 12) + 1;
    const day = ((index * 7 + seed * 3) % 27) + 1;
    const date = `2024-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const amount = 180 + ((index * 137 + seed * 53) % 9600);
    const status = STATUSES[(index + seed * 2) % STATUSES.length];

    if (type === 'factura') {
      const taxRate = 21;
      const taxBase = Math.round((amount / (1 + taxRate / 100)) * 100) / 100;
      const taxAmount = Math.round((amount - taxBase) * 100) / 100;
      const direction: DocumentDirection = (index + seed) % 2 === 0 ? 'ingreso' : 'gasto';
      const hasIrpf = direction === 'ingreso' && (index + seed) % 3 === 0;
      const irpfRate = hasIrpf ? 15 : null;
      const irpfAmount = hasIrpf ? Math.round(taxBase * 0.15 * 100) / 100 : null;
      documents.push({
        name,
        type,
        month,
        date,
        amount,
        status,
        issuerName: name,
        issuerTaxId: ISSUER_TAX_IDS[name] ?? 'B00000000',
        invoiceNumber: `FRA-${date.slice(0, 4)}-${String(index + seed * 20).padStart(4, '0')}`,
        dueDate: addDays(date, 30),
        taxBase,
        taxRate,
        taxAmount,
        irpfRate,
        irpfAmount,
        currency: 'EUR',
        direction,
        staffMemberId: null,
      });
      continue;
    }

    documents.push({
      name,
      type,
      month,
      date,
      amount,
      status,
      issuerName: null,
      issuerTaxId: null,
      invoiceNumber: null,
      dueDate: null,
      taxBase: null,
      taxRate: null,
      taxAmount: null,
      irpfRate: null,
      irpfAmount: null,
      currency: 'EUR',
      direction: 'gasto',
      staffMemberId: null,
    });
  }

  return documents;
}
