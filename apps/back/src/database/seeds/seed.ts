import { randomUUID } from 'node:crypto';
import dataSource from '../data-source';

type DocumentType = 'factura' | 'nomina' | 'impuesto';
type DocumentStatus = 'pagado' | 'pendiente' | 'vencido';
type DocumentDirection = 'ingreso' | 'gasto';

const COMPANY = {
  name: 'Ledgerly',
  legalName: 'Ledgerly Gestión S.L.',
  taxId: 'B99887766',
  sector: 'Gestión y administración',
  email: 'info@ledgerly.es',
  phone: '+34 976 000 111',
  website: 'https://www.ledgerly.es',
  address: 'Calle Coso 45',
  city: 'Zaragoza',
  postalCode: '50001',
  country: 'España',
};

type ProjectType =
  | 'client'
  | 'internal'
  | 'audiovisual'
  | 'construction'
  | 'consulting'
  | 'other';
type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';
type ProjectCurrency = 'EUR' | 'USD' | 'GBP';

interface ProjectSeed {
  name: string;
  code: string;
  type: ProjectType;
  status: ProjectStatus;
  description: string | null;
  clientCompany: string | null;
  clientTaxId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  currency: ProjectCurrency;
  fiscalYear: string | null;
  manager: string | null;
}

const PROJECTS: ProjectSeed[] = [
  {
    name: 'Planta Zaragoza',
    code: 'GA-ZGZ-24',
    type: 'construction',
    status: 'active',
    description: 'Construcción de nave industrial y oficinas anexas en el polígono de Malpica.',
    clientCompany: 'Inmobiliaria Ebro SL',
    clientTaxId: 'B12345678',
    contactName: 'Marta Solís',
    contactEmail: 'marta.solis@inmobiliariaebro.es',
    contactPhone: '+34 976 123 456',
    address: 'Polígono Malpica, Zaragoza',
    startDate: '2024-01-15',
    endDate: null,
    budget: 850000,
    currency: 'EUR',
    fiscalYear: '2024',
    manager: 'Carlos Ruiz',
  },
  {
    name: 'Central Logística',
    code: 'GA-LOG-23',
    type: 'internal',
    status: 'active',
    description: 'Modernización del centro logístico propio.',
    clientCompany: null,
    clientTaxId: null,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    address: null,
    startDate: '2023-09-01',
    endDate: null,
    budget: 620000,
    currency: 'EUR',
    fiscalYear: '2023',
    manager: 'Elena Torres',
  },
  {
    name: 'Expansión Sur',
    code: 'GA-SUR-25',
    type: 'consulting',
    status: 'on_hold',
    description: 'Estudio de viabilidad para la expansión a Andalucía.',
    clientCompany: 'Grupo Meridional SA',
    clientTaxId: 'A87654321',
    contactName: 'Javier Ortega',
    contactEmail: 'javier.ortega@grupomeridional.es',
    contactPhone: '+34 954 887 112',
    address: 'Calle Sierpes 22, Sevilla',
    startDate: '2025-02-01',
    endDate: null,
    budget: 95000,
    currency: 'EUR',
    fiscalYear: '2025',
    manager: 'Carlos Ruiz',
  },
  {
    name: 'Fábrica Bilbao',
    code: 'TN-BIO-22',
    type: 'construction',
    status: 'completed',
    description: 'Ampliación de la planta productiva de Bilbao.',
    clientCompany: 'Talleres Nervión SL',
    clientTaxId: 'B45612378',
    contactName: 'Iker Zabala',
    contactEmail: 'iker.zabala@talleresnervion.es',
    contactPhone: '+34 944 556 778',
    address: 'Polígono Asua, Erandio',
    startDate: '2022-03-10',
    endDate: '2023-11-30',
    budget: 1200000,
    currency: 'EUR',
    fiscalYear: '2022',
    manager: 'Elena Torres',
  },
  {
    name: 'Tienda Online',
    code: 'TN-ECM-24',
    type: 'client',
    status: 'active',
    description: 'Desarrollo y puesta en marcha de la tienda e-commerce.',
    clientCompany: 'Talleres Nervión SL',
    clientTaxId: 'B45612378',
    contactName: 'Ainhoa Larrea',
    contactEmail: 'ainhoa.larrea@talleresnervion.es',
    contactPhone: '+34 944 556 900',
    address: null,
    startDate: '2024-04-01',
    endDate: null,
    budget: 48000,
    currency: 'USD',
    fiscalYear: '2024',
    manager: 'David Pérez',
  },
  {
    name: 'Residencial Aurora',
    code: 'CD-AUR-25',
    type: 'construction',
    status: 'active',
    description: 'Promoción residencial de 40 viviendas.',
    clientCompany: 'Constructora Aurora SA',
    clientTaxId: 'A11223344',
    contactName: 'Lucía Fernández',
    contactEmail: 'lucia.fernandez@constructoraaurora.es',
    contactPhone: '+34 913 445 221',
    address: 'Avenida de la Aurora 5, Madrid',
    startDate: '2025-01-20',
    endDate: null,
    budget: 3200000,
    currency: 'EUR',
    fiscalYear: '2025',
    manager: 'Carlos Ruiz',
  },
  {
    name: 'Nave Industrial B7',
    code: 'CD-NB7-24',
    type: 'audiovisual',
    status: 'archived',
    description: 'Producción audiovisual corporativa para la inauguración de la nave B7.',
    clientCompany: null,
    clientTaxId: null,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    address: null,
    startDate: '2024-05-05',
    endDate: '2024-06-15',
    budget: 15000,
    currency: 'EUR',
    fiscalYear: '2024',
    manager: 'David Pérez',
  },
  {
    name: 'Reforma Oficinas',
    code: 'CD-OFC-23',
    type: 'other',
    status: 'on_hold',
    description: null,
    clientCompany: null,
    clientTaxId: null,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    address: null,
    startDate: null,
    endDate: null,
    budget: null,
    currency: 'EUR',
    fiscalYear: null,
    manager: null,
  },
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
const ISSUER_TAX_IDS: Record<string, string> = {
  'Suministros Norte': 'B10203040',
  'Transporte Rápido SL': 'B20304050',
  'Materiales García': 'B30405060',
  'Servicios Cloud SA': 'B40506070',
  'Oficina Total': 'B50607080',
  'Distribuciones Ebro': 'B60708090',
};

interface StaffMemberSeed {
  firstName: string;
  lastName: string;
  position: string;
}

const STAFF_MEMBERS: StaffMemberSeed[] = [
  { firstName: 'Carlos', lastName: 'Ruiz', position: 'Jefe de obra' },
  { firstName: 'Elena', lastName: 'Torres', position: 'Encargada' },
  { firstName: 'David', lastName: 'Pérez', position: 'Administrativo' },
];

interface DocumentSeed {
  name: string;
  type: DocumentType;
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
  staffMemberId: string | null;
}

function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function generateDocuments(seed: number, staffMemberIds: string[]): DocumentSeed[] {
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

    if (type === 'factura') {
      const taxRate = 21;
      const taxBase = Math.round((amount / (1 + taxRate / 100)) * 100) / 100;
      const taxAmount = Math.round((amount - taxBase) * 100) / 100;
      const direction: DocumentDirection = (i + seed) % 2 === 0 ? 'ingreso' : 'gasto';
      const hasIrpf = direction === 'ingreso' && (i + seed) % 3 === 0;
      const irpfRate = hasIrpf ? 15 : null;
      const irpfAmount = hasIrpf ? Math.round(taxBase * 0.15 * 100) / 100 : null;
      docs.push({
        name,
        type,
        month,
        date,
        amount,
        status,
        issuerName: name,
        issuerTaxId: ISSUER_TAX_IDS[name] ?? 'B00000000',
        invoiceNumber: `FRA-${date.slice(0, 4)}-${String(i + seed * 20).padStart(4, '0')}`,
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
    } else {
      const staffMemberId =
        type === 'nomina' ? staffMemberIds[(i + seed) % staffMemberIds.length] : null;
      docs.push({
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
        staffMemberId,
      });
    }
  }
  return docs;
}

async function run(): Promise<void> {
  await dataSource.initialize();

  const existing: unknown = await dataSource.query(
    `SELECT COUNT(*)::int AS count FROM companies`,
  );
  const alreadySeeded =
    Array.isArray(existing) &&
    existing.length > 0 &&
    Number((existing[0] as { count: number }).count) > 0;
  if (alreadySeeded) {
    console.log('Seed omitido: la base de datos ya contiene datos.');
    await dataSource.destroy();
    return;
  }

  await dataSource.transaction(async (manager) => {
    const companyId = randomUUID();
    await manager.query(
      `INSERT INTO companies (
         id, name, legal_name, tax_id, sector, email, phone, website,
         address, city, postal_code, country
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
       )`,
      [
        companyId,
        COMPANY.name,
        COMPANY.legalName,
        COMPANY.taxId,
        COMPANY.sector,
        COMPANY.email,
        COMPANY.phone,
        COMPANY.website,
        COMPANY.address,
        COMPANY.city,
        COMPANY.postalCode,
        COMPANY.country,
      ],
    );

    const staffMemberIds: string[] = [];
    for (const staffMember of STAFF_MEMBERS) {
      const staffMemberId = randomUUID();
      staffMemberIds.push(staffMemberId);
      await manager.query(
        `INSERT INTO staff_members (id, first_name, last_name, position)
         VALUES ($1, $2, $3, $4)`,
        [staffMemberId, staffMember.firstName, staffMember.lastName, staffMember.position],
      );
    }

    for (let p = 0; p < PROJECTS.length; p++) {
      const project = PROJECTS[p];
      const projectId = randomUUID();
      await manager.query(
        `INSERT INTO projects (
           id, name, code, type, status, description, client_company, client_tax_id,
           contact_name, contact_email, contact_phone, address, start_date, end_date,
           budget, currency, fiscal_year, manager
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
         )`,
        [
          projectId,
          project.name,
          project.code,
          project.type,
          project.status,
          project.description,
          project.clientCompany,
          project.clientTaxId,
          project.contactName,
          project.contactEmail,
          project.contactPhone,
          project.address,
          project.startDate,
          project.endDate,
          project.budget,
          project.currency,
          project.fiscalYear,
          project.manager,
        ],
      );

      const documents = generateDocuments(p + 1, staffMemberIds);
      for (const document of documents) {
        await manager.query(
          `INSERT INTO documents (
             id, project_id, name, type, month, date, amount, status,
             issuer_name, issuer_tax_id, invoice_number, due_date,
             tax_base, tax_rate, tax_amount, irpf_rate, irpf_amount, currency, direction,
             staff_member_id
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
          [
            randomUUID(),
            projectId,
            document.name,
            document.type,
            document.month,
            document.date,
            document.amount,
            document.status,
            document.issuerName,
            document.issuerTaxId,
            document.invoiceNumber,
            document.dueDate,
            document.taxBase,
            document.taxRate,
            document.taxAmount,
            document.irpfRate,
            document.irpfAmount,
            document.currency,
            document.direction,
            document.staffMemberId,
          ],
        );
      }
    }
  });

  console.log('Seed completado: empresa Ledgerly, proyectos y documentos.');
  await dataSource.destroy();
}

run().catch(() => {
  process.stderr.write('Seed failed\n');
  process.exit(1);
});
