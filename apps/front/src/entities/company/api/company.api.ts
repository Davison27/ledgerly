import { get, patch } from '@/shared/api/httpClient';
import { stripEmpty } from '@/shared/api/sanitize';
import type { CompanyBrandingDto, CompanyDto, UpdateCompanyPayload } from './types';

export function getCompany(): Promise<CompanyDto> {
  return get<CompanyDto>('/company');
}

export function fetchCompanyBranding(): Promise<CompanyBrandingDto> {
  return get<CompanyBrandingDto>('/company/branding');
}

export function updateCompany(payload: UpdateCompanyPayload): Promise<CompanyDto> {
  return patch<CompanyDto>('/company', stripEmpty(payload));
}
