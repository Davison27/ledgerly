import { get, patch } from './httpClient';
import { stripEmpty } from './sanitize';
import type { CompanyDto, UpdateCompanyPayload } from './types';

export function getCompany(): Promise<CompanyDto> {
  return get<CompanyDto>('/company');
}

export function updateCompany(payload: UpdateCompanyPayload): Promise<CompanyDto> {
  return patch<CompanyDto>('/company', stripEmpty(payload));
}
