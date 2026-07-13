// Datos mock de documentos por proyecto.
// Solo se cargan en modo local (ver src/data/documents.ts y src/config.ts).
// Portado del generador determinista del prototipo de diseño de Ledgerly ERP.

export type DocumentType = 'factura' | 'nomina' | 'impuesto';
export type DocumentStatus = 'pagado' | 'pendiente' | 'vencido';

export interface ProjectDocument {
  id: string;
  name: string;
  type: DocumentType;
  /** 1-12 */
  month: number;
  /** ISO date yyyy-mm-dd */
  date: string;
  /** Importe en euros */
  amount: number;
  status: DocumentStatus;
}

const NAMES: Record<DocumentType, string[]> = {
  factura: [
    'Suministros Norte',
    'Transporte Rápido SL',
    'Materiales García',
    'Servicios Cloud SA',
    'Oficina Total',
    'Distribuciones Ebro',
  ],
  nomina: [
    'Nómina Enero',
    'Nómina Febrero',
    'Nómina Marzo',
    'Nómina Abril',
    'Nómina Mayo',
    'Nómina Junio',
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

const TYPES: DocumentType[] = ['factura', 'nomina', 'impuesto'];
const STATUSES: DocumentStatus[] = ['pagado', 'pendiente', 'vencido'];

/**
 * Genera de forma determinista los documentos de un proyecto a partir de su id.
 * Mismo algoritmo que el prototipo de diseño, para que Documentos y Panel
 * compartan la misma fuente de datos.
 */
export function generateProjectDocuments(projectId: string): ProjectDocument[] {
  const seed = projectId.charCodeAt(projectId.length - 1);
  const docs: ProjectDocument[] = [];

  for (let i = 0; i < 20; i++) {
    const type = TYPES[(i + seed) % 3];
    const names = NAMES[type];
    const name = names[i % names.length];
    const month = ((i * 2 + seed) % 12) + 1;
    const day = ((i * 7 + seed * 3) % 27) + 1;
    const date = `2024-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const amount = 180 + ((i * 137 + seed * 53) % 9600);
    const status = STATUSES[(i + seed * 2) % 3];
    docs.push({ id: `${projectId}-d${i}`, name, type, month, date, amount, status });
  }

  return docs.sort((a, b) => b.date.localeCompare(a.date));
}
