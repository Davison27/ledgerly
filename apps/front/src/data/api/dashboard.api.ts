import { buildQueryString, get } from './httpClient';
import type { CompanyDashboardDto } from './types';

export function getCompanyDashboard(year?: number): Promise<CompanyDashboardDto> {
  return get<CompanyDashboardDto>(`/dashboard${buildQueryString({ year })}`);
}
