export type ProjectType =
  | 'client'
  | 'internal'
  | 'audiovisual'
  | 'construction'
  | 'consulting'
  | 'other';

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';

export type ProjectCurrency = 'EUR' | 'USD' | 'GBP';

export interface Project {
  id: string;
  name: string;
  code: string;
  documentCount: number;
  pendingCount: number;
  type?: ProjectType;
  status?: ProjectStatus;
  description?: string;
  clientCompany?: string;
  clientTaxId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  currency?: ProjectCurrency;
  fiscalYear?: string;
  manager?: string;
}

export type ProjectFormValues = Omit<Project, 'id' | 'documentCount' | 'pendingCount'>;

export interface Company {
  id: string;
  name: string;
  legalName?: string;
  taxId?: string;
  sector?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  logo?: string;
}

export const mockCompany: Company = {
  id: 'ledgerly',
  name: 'Ledgerly',
  legalName: 'Ledgerly Gestión S.L.',
  taxId: 'B12345678',
  sector: 'Gestión y administración',
  email: 'info@ledgerly.example',
  phone: '+34 976 123 456',
  website: 'https://ledgerly.example',
  address: 'Calle Coso, 45',
  city: 'Zaragoza',
  postalCode: '50001',
  country: 'España',
};

export const mockProjects: Project[] = [
  { id: 'p1', name: 'Planta Zaragoza', code: 'GA-ZGZ-24', documentCount: 24, pendingCount: 5 },
  { id: 'p2', name: 'Central Logística', code: 'GA-LOG-23', documentCount: 18, pendingCount: 3 },
  { id: 'p3', name: 'Expansión Sur', code: 'GA-SUR-25', documentCount: 12, pendingCount: 7 },
  { id: 'p4', name: 'Fábrica Bilbao', code: 'TN-BIO-22', documentCount: 31, pendingCount: 9 },
  { id: 'p5', name: 'Tienda Online', code: 'TN-ECM-24', documentCount: 15, pendingCount: 2 },
  { id: 'p6', name: 'Residencial Aurora', code: 'CD-AUR-25', documentCount: 27, pendingCount: 11 },
  { id: 'p7', name: 'Nave Industrial B7', code: 'CD-NB7-24', documentCount: 20, pendingCount: 6 },
  { id: 'p8', name: 'Reforma Oficinas', code: 'CD-OFC-23', documentCount: 9, pendingCount: 1 },
];
