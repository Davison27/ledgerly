import { randomUUID } from 'node:crypto';
import dataSource from '../data-source';
import { generateDocuments } from './document-seed-data';

const COMPANY = {
  name: 'Ledgerly',
  legalName: 'Ledgerly Management LLC',
  taxId: 'B99887766',
  sector: 'Management and administration',
  email: 'info@ledgerly.com',
  phone: '+34 976 000 111',
  website: 'https://www.ledgerly.com',
  address: 'Coso Street 45',
  city: 'Zaragoza',
  postalCode: '50001',
  country: 'Spain',
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
  clientKey: string | null;
  address: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  currency: ProjectCurrency;
  manager: string | null;
}

interface ClientSeed {
  name: string;
  taxId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

const CLIENTS: ClientSeed[] = [
  {
    name: 'Ebro Real Estate LLC',
    taxId: 'B12345678',
    contactName: 'Martha Stone',
    contactEmail: 'martha.stone@ebrorealestate.com',
    contactPhone: '+34 976 123 456',
  },
  {
    name: 'Southern Group Inc.',
    taxId: 'A87654321',
    contactName: 'James Ortiz',
    contactEmail: 'james.ortiz@southerngroup.com',
    contactPhone: '+34 954 887 112',
  },
  {
    name: 'Nervion Workshops LLC',
    taxId: 'B45612378',
    contactName: 'Ethan Reed',
    contactEmail: 'ethan.reed@nervionworkshops.com',
    contactPhone: '+34 944 556 778',
  },
  {
    name: 'Aurora Construction Inc.',
    taxId: 'A11223344',
    contactName: 'Lucy Fernandez',
    contactEmail: 'lucy.fernandez@auroraconstruction.com',
    contactPhone: '+34 913 445 221',
  },
];

const PROJECTS: ProjectSeed[] = [
  {
    name: 'Zaragoza Plant',
    code: 'GA-ZGZ-24',
    type: 'construction',
    status: 'active',
    description: 'Construction of an industrial warehouse and adjoining offices in Malpica Park.',
    clientKey: 'B12345678',
    address: 'Malpica Park, Zaragoza',
    startDate: '2024-01-15',
    endDate: null,
    budget: 850000,
    currency: 'EUR',
    manager: 'Charles Stone',
  },
  {
    name: 'Logistics Hub',
    code: 'GA-LOG-23',
    type: 'internal',
    status: 'active',
    description: 'Modernization of the company logistics hub.',
    clientKey: null,
    address: null,
    startDate: '2023-09-01',
    endDate: null,
    budget: 620000,
    currency: 'EUR',
    manager: 'Helen Torres',
  },
  {
    name: 'Southern Expansion',
    code: 'GA-SUR-25',
    type: 'consulting',
    status: 'on_hold',
    description: 'Feasibility study for expansion into southern Spain.',
    clientKey: 'A87654321',
    address: 'Sierpes Street 22, Seville',
    startDate: '2025-02-01',
    endDate: null,
    budget: 95000,
    currency: 'EUR',
    manager: 'Charles Stone',
  },
  {
    name: 'Bilbao Factory',
    code: 'TN-BIO-22',
    type: 'construction',
    status: 'completed',
    description: 'Expansion of the Bilbao production facility.',
    clientKey: 'B45612378',
    address: 'Asua Park, Erandio',
    startDate: '2022-03-10',
    endDate: '2023-11-30',
    budget: 1200000,
    currency: 'EUR',
    manager: 'Helen Torres',
  },
  {
    name: 'Online Store',
    code: 'TN-ECM-24',
    type: 'client',
    status: 'active',
    description: 'Development and launch of the e-commerce store.',
    clientKey: 'B45612378',
    address: null,
    startDate: '2024-04-01',
    endDate: null,
    budget: 48000,
    currency: 'USD',
    manager: 'David Perez',
  },
  {
    name: 'Aurora Residential',
    code: 'CD-AUR-25',
    type: 'construction',
    status: 'active',
    description: 'Residential development with 40 homes.',
    clientKey: 'A11223344',
    address: 'Aurora Avenue 5, Madrid',
    startDate: '2025-01-20',
    endDate: null,
    budget: 3200000,
    currency: 'EUR',
    manager: 'Charles Stone',
  },
  {
    name: 'Industrial Building B7',
    code: 'CD-NB7-24',
    type: 'audiovisual',
    status: 'archived',
    description: 'Corporate audiovisual production for the opening of Building B7.',
    clientKey: null,
    address: null,
    startDate: '2024-05-05',
    endDate: '2024-06-15',
    budget: 15000,
    currency: 'EUR',
    manager: 'David Perez',
  },
  {
    name: 'Office Renovation',
    code: 'CD-OFC-23',
    type: 'other',
    status: 'on_hold',
    description: null,
    clientKey: null,
    address: null,
    startDate: null,
    endDate: null,
    budget: null,
    currency: 'EUR',
    manager: null,
  },
];

interface StaffMemberSeed {
  firstName: string;
  lastName: string;
  position: string;
}

const STAFF_MEMBERS: StaffMemberSeed[] = [
  { firstName: 'Charles', lastName: 'Stone', position: 'Site Manager' },
  { firstName: 'Helen', lastName: 'Torres', position: 'Supervisor' },
  { firstName: 'David', lastName: 'Perez', position: 'Administrator' },
];

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
    console.log('Seed skipped: the database already contains data.');
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

    for (const staffMember of STAFF_MEMBERS) {
      const staffMemberId = randomUUID();
      await manager.query(
        `INSERT INTO staff_members (id, first_name, last_name, position)
         VALUES ($1, $2, $3, $4)`,
        [staffMemberId, staffMember.firstName, staffMember.lastName, staffMember.position],
      );
    }

    const clientIds = new Map<string, string>();
    for (const client of CLIENTS) {
      const clientId = randomUUID();
      clientIds.set(client.taxId, clientId);
      await manager.query(
        `INSERT INTO clients (id, name, tax_id, contact_name, contact_email, contact_phone)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [clientId, client.name, client.taxId, client.contactName, client.contactEmail, client.contactPhone],
      );
    }

    for (let p = 0; p < PROJECTS.length; p++) {
      const project = PROJECTS[p];
      const projectId = randomUUID();
      await manager.query(
        `INSERT INTO projects (
           id, name, code, type, status, description, client_id, address, start_date, end_date,
           budget, currency, manager
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
         )`,
        [
          projectId,
          project.name,
          project.code,
          project.type,
          project.status,
          project.description,
          project.clientKey === null ? null : clientIds.get(project.clientKey),
          project.address,
          project.startDate,
          project.endDate,
          project.budget,
          project.currency,
          project.manager,
        ],
      );

      const documents = generateDocuments(p + 1);
      for (const document of documents) {
        await manager.query(
          `INSERT INTO documents (
             id, project_id, name, type, date, amount, status,
             issuer_name, issuer_tax_id, invoice_number, due_date,
             tax_base, tax_rate, tax_amount, irpf_rate, irpf_amount, currency, direction,
             staff_member_id
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
          [
            randomUUID(),
            projectId,
            document.name,
            document.type,
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

  console.log('Seed completed: Ledgerly company, projects, and documents.');
  await dataSource.destroy();
}

run().catch(() => {
  process.stderr.write('Seed failed\n');
  process.exit(1);
});
