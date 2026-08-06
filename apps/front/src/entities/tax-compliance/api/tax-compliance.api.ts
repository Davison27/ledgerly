import { buildQueryString, get, patch, post } from '@/shared/api/httpClient';
import type {
  RefreshTaxSourcesResultDto,
  SaveTaxClientProfilePayload,
  TaxClientProfileDto,
  TaxComplianceSettingsDto,
  TaxDeadlineDto,
  TaxObligationDto,
  TaxSourceStateDto,
  UpdateTaxComplianceSettingsPayload,
} from './types';

export function getTaxComplianceSettings(): Promise<TaxComplianceSettingsDto> {
  return get<TaxComplianceSettingsDto>('/tax-compliance/settings');
}

export function updateTaxComplianceSettings(
  payload: UpdateTaxComplianceSettingsPayload,
): Promise<TaxComplianceSettingsDto> {
  return patch<TaxComplianceSettingsDto>('/tax-compliance/settings', payload);
}

export function listTaxObligations(): Promise<TaxObligationDto[]> {
  return get<TaxObligationDto[]>('/tax-compliance/catalog');
}

export function listTaxClientProfiles(): Promise<TaxClientProfileDto[]> {
  return get<TaxClientProfileDto[]>('/tax-compliance/profiles');
}

export function getTaxClientProfile(projectId: string): Promise<TaxClientProfileDto | null> {
  return get<TaxClientProfileDto | null>(`/tax-compliance/profiles/${projectId}`);
}

export function saveTaxClientProfile(
  projectId: string,
  payload: SaveTaxClientProfilePayload,
): Promise<TaxClientProfileDto> {
  return patch<TaxClientProfileDto>(`/tax-compliance/profiles/${projectId}`, payload);
}

export function listTaxDeadlines(
  from: string,
  to: string,
  projectId?: string,
): Promise<TaxDeadlineDto[]> {
  return get<TaxDeadlineDto[]>(
    `/tax-compliance/calendar${buildQueryString({ from, to, projectId })}`,
  );
}

export function listTaxSourceStates(): Promise<TaxSourceStateDto[]> {
  return get<TaxSourceStateDto[]>('/tax-compliance/sources');
}

export function refreshTaxSources(): Promise<RefreshTaxSourcesResultDto> {
  return post<RefreshTaxSourcesResultDto>('/tax-compliance/sources/refresh');
}

export function reviewTaxSource(sourceKey: string): Promise<TaxSourceStateDto> {
  return patch<TaxSourceStateDto>(`/tax-compliance/sources/${sourceKey}/review`);
}
