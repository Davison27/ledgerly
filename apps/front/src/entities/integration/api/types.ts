export type IntegrationKeyDto =
  | 'google-calendar'
  | 'google-drive'
  | 'gmail'
  | 'google-sheets'
  | 'google-contacts'
  | 'outlook-calendar'
  | 'onedrive'
  | 'excel-online'
  | 'slack'
  | 'telegram'
  | 'discord'
  | 'outgoing-webhooks'
  | 'calendar-feed'
  | 'smtp-imap'
  | 'api-keys';

export type IntegrationFamilyDto = 'google' | 'microsoft' | 'communication' | 'open';
export type IntegrationStatusDto = 'connected' | 'disconnected' | 'error';
export type IntegrationErrorCodeDto = 'token_expired' | 'revoked' | 'rate_limited' | 'unreachable';

export type IntegrationSettingValueDto = string | boolean | null;

export interface IntegrationDto {
  key: IntegrationKeyDto;
  family: IntegrationFamilyDto;
  status: IntegrationStatusDto;
  enabled: boolean;
  connectedAccount: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  errorCode: IntegrationErrorCodeDto | null;
  settings: Record<string, IntegrationSettingValueDto>;
}

export interface UpdateIntegrationPayload {
  enabled?: boolean;
  settings?: Record<string, IntegrationSettingValueDto>;
}
