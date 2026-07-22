import { getCompany, updateCompany as updateCompanyRequest } from '../api/company.api';
import type { CompanyDto, UpdateCompanyPayload } from '../api/types';

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
  brandColor?: string;
}

function mapCompany(dto: CompanyDto): Company {
  return {
    id: dto.id,
    name: dto.name,
    legalName: dto.legalName ?? undefined,
    taxId: dto.taxId ?? undefined,
    sector: dto.sector ?? undefined,
    email: dto.email ?? undefined,
    phone: dto.phone ?? undefined,
    website: dto.website ?? undefined,
    address: dto.address ?? undefined,
    city: dto.city ?? undefined,
    postalCode: dto.postalCode ?? undefined,
    country: dto.country ?? undefined,
    logo: dto.logo ?? undefined,
    brandColor: dto.brandColor ?? undefined,
  };
}

export async function fetchCompany(): Promise<Company> {
  const dto = await getCompany();
  return mapCompany(dto);
}

export function companyNeedsSetup(company: Company): boolean {
  return !company.id;
}

export async function updateCompany(patch: Partial<Omit<Company, 'id'>>): Promise<Company> {
  const payload: UpdateCompanyPayload = { ...patch };
  const dto = await updateCompanyRequest(payload);
  return mapCompany(dto);
}
