import { DocumentProps } from '../../../documents/domain/document';
import { DocumentType } from '../../../documents/domain/document-type';
import { DocumentStatus } from '../../../documents/domain/document-status';
import { DocumentDirection } from '../../../documents/domain/document-direction';

interface DemoDocumentSeed {
  name: string;
  type: DocumentType;
  offsetDays: number;
  amount: number;
  status: DocumentStatus;
  issuerName: string | null;
  issuerTaxId: string | null;
  invoiceNumber: string | null;
  dueOffsetDays: number | null;
  direction: DocumentDirection;
  irpfRate?: number | null;
  staffMemberIndex?: number;
}

const VAT_RATE = 21;

const RAW_DOCUMENTS: DemoDocumentSeed[] = [
  {
    name: 'Suministros Norte',
    type: 'factura',
    offsetDays: -75,
    amount: 1250,
    status: 'pagado',
    issuerName: 'Suministros Norte',
    issuerTaxId: 'B10203040',
    invoiceNumber: 'FRA-DEMO-0001',
    dueOffsetDays: -45,
    direction: 'ingreso',
  },
  {
    name: 'Materiales García',
    type: 'factura',
    offsetDays: -60,
    amount: 3400.5,
    status: 'pagado',
    issuerName: 'Materiales García',
    issuerTaxId: 'B30405060',
    invoiceNumber: 'FRA-DEMO-0002',
    dueOffsetDays: -30,
    direction: 'ingreso',
    irpfRate: 15,
  },
  {
    name: 'Servicios Cloud SA',
    type: 'factura',
    offsetDays: -40,
    amount: 89.9,
    status: 'pendiente',
    issuerName: 'Servicios Cloud SA',
    issuerTaxId: 'B40506070',
    invoiceNumber: 'FRA-DEMO-0003',
    dueOffsetDays: 20,
    direction: 'gasto',
  },
  {
    name: 'Oficina Total',
    type: 'factura',
    offsetDays: -20,
    amount: 560.75,
    status: 'vencido',
    issuerName: 'Oficina Total',
    issuerTaxId: 'B50607080',
    invoiceNumber: 'FRA-DEMO-0004',
    dueOffsetDays: -5,
    direction: 'gasto',
  },
  {
    name: 'Nómina mensual',
    type: 'nomina',
    offsetDays: -30,
    amount: 2100,
    status: 'pagado',
    issuerName: null,
    issuerTaxId: null,
    invoiceNumber: null,
    dueOffsetDays: null,
    direction: 'gasto',
    staffMemberIndex: 0,
  },
  {
    name: 'Nómina mensual',
    type: 'nomina',
    offsetDays: -60,
    amount: 2100,
    status: 'pagado',
    issuerName: null,
    issuerTaxId: null,
    invoiceNumber: null,
    dueOffsetDays: null,
    direction: 'gasto',
    staffMemberIndex: 1,
  },
  {
    name: 'IVA Trimestre',
    type: 'impuesto',
    offsetDays: -50,
    amount: 780.4,
    status: 'pendiente',
    issuerName: null,
    issuerTaxId: null,
    invoiceNumber: null,
    dueOffsetDays: 10,
    direction: 'gasto',
  },
  {
    name: 'Retenciones IRPF',
    type: 'impuesto',
    offsetDays: -50,
    amount: 310.15,
    status: 'pagado',
    issuerName: null,
    issuerTaxId: null,
    invoiceNumber: null,
    dueOffsetDays: null,
    direction: 'gasto',
  },
];

function isoDateWithOffset(base: Date, offsetDays: number): string {
  const date = new Date(base);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function buildDemoDocuments(
  projectId: string,
  generateId: () => string,
  staffMemberIds: string[],
  today: Date,
): DocumentProps[] {
  return RAW_DOCUMENTS.map((seed) => {
    const date = isoDateWithOffset(today, seed.offsetDays);
    const month = Number(date.slice(5, 7));
    const dueDate = seed.dueOffsetDays !== null ? isoDateWithOffset(today, seed.dueOffsetDays) : null;
    const isInvoice = seed.type === 'factura';
    const taxBase = isInvoice ? Math.round((seed.amount / (1 + VAT_RATE / 100)) * 100) / 100 : null;
    const taxAmount = isInvoice && taxBase !== null ? Math.round((seed.amount - taxBase) * 100) / 100 : null;
    const taxRate = isInvoice ? VAT_RATE : null;
    const irpfRate = seed.irpfRate ?? null;
    const irpfAmount =
      irpfRate !== null && taxBase !== null ? Math.round(taxBase * (irpfRate / 100) * 100) / 100 : null;
    const staffMemberId =
      seed.staffMemberIndex !== undefined ? staffMemberIds[seed.staffMemberIndex] : null;

    return {
      id: generateId(),
      projectId,
      name: seed.name,
      type: seed.type,
      month,
      date,
      amount: seed.amount,
      status: seed.status,
      issuerName: seed.issuerName,
      issuerTaxId: seed.issuerTaxId,
      invoiceNumber: seed.invoiceNumber,
      dueDate,
      taxBase,
      taxRate,
      taxAmount,
      irpfRate,
      irpfAmount,
      currency: 'EUR',
      staffMemberId,
      direction: seed.direction,
    };
  });
}
