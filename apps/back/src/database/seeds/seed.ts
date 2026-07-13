import { randomUUID } from 'node:crypto';
import dataSource from '../data-source';

type DocumentType = 'factura' | 'nomina' | 'impuesto';
type DocumentStatus = 'pagado' | 'pendiente' | 'vencido';

const COMPANY = {
  name: 'Ledgerly',
  sector: 'Gestión y administración',
  color: '#1c5d97',
};

const PROJECTS = [
  { name: 'Planta Zaragoza', code: 'GA-ZGZ-24' },
  { name: 'Central Logística', code: 'GA-LOG-23' },
  { name: 'Expansión Sur', code: 'GA-SUR-25' },
  { name: 'Fábrica Bilbao', code: 'TN-BIO-22' },
  { name: 'Tienda Online', code: 'TN-ECM-24' },
  { name: 'Residencial Aurora', code: 'CD-AUR-25' },
  { name: 'Nave Industrial B7', code: 'CD-NB7-24' },
  { name: 'Reforma Oficinas', code: 'CD-OFC-23' },
];

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

interface DocumentSeed {
  name: string;
  type: DocumentType;
  month: number;
  date: string;
  amount: number;
  status: DocumentStatus;
}

function generateDocuments(seed: number): DocumentSeed[] {
  const docs: DocumentSeed[] = [];
  for (let i = 0; i < 20; i++) {
    const type = TYPES[(i + seed) % 3];
    const names = NAMES[type];
    const name = names[i % names.length];
    const month = ((i * 2 + seed) % 12) + 1;
    const day = ((i * 7 + seed * 3) % 27) + 1;
    const date = `2024-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const amount = 180 + ((i * 137 + seed * 53) % 9600);
    const status = STATUSES[(i + seed * 2) % 3];
    docs.push({ name, type, month, date, amount, status });
  }
  return docs;
}

async function run(): Promise<void> {
  await dataSource.initialize();

  const existing = await dataSource.query(
    `SELECT COUNT(*)::int AS count FROM companies`,
  );
  if (existing[0].count > 0) {
    console.log('Seed omitido: la base de datos ya contiene datos.');
    await dataSource.destroy();
    return;
  }

  await dataSource.transaction(async (manager) => {
    const companyId = randomUUID();
    await manager.query(
      `INSERT INTO companies (id, name, sector, color) VALUES ($1, $2, $3, $4)`,
      [companyId, COMPANY.name, COMPANY.sector, COMPANY.color],
    );

    for (let p = 0; p < PROJECTS.length; p++) {
      const project = PROJECTS[p];
      const projectId = randomUUID();
      await manager.query(
        `INSERT INTO projects (id, name, code) VALUES ($1, $2, $3)`,
        [projectId, project.name, project.code],
      );

      const documents = generateDocuments(p + 1);
      for (const document of documents) {
        await manager.query(
          `INSERT INTO documents (id, project_id, name, type, month, date, amount, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            randomUUID(),
            projectId,
            document.name,
            document.type,
            document.month,
            document.date,
            document.amount,
            document.status,
          ],
        );
      }
    }
  });

  console.log('Seed completado: empresa Ledgerly, proyectos y documentos.');
  await dataSource.destroy();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
