import { get } from './httpClient';
import type { CompanyDashboardDto } from './types';

export function getCompanyDashboard(): Promise<CompanyDashboardDto> {
  return get<CompanyDashboardDto>('/dashboard');
}
