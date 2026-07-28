import { fakeLatency } from '@/shared/lib/fakeLatency';
import { findIntegration, integrationsStore, patchIntegration } from './integrations.fixtures';
import type { IntegrationDto, IntegrationKeyDto, IntegrationSettingValueDto } from './types';

const CURRENT_ACCOUNT = 'david@ledgerly.es';

function cloneIntegration(integration: IntegrationDto): IntegrationDto {
  return { ...integration, settings: { ...integration.settings } };
}

function requireIntegration(key: IntegrationKeyDto): IntegrationDto {
  const integration = findIntegration(key);
  if (!integration) throw new Error('integration_not_found');
  return integration;
}

export function listIntegrations(): Promise<IntegrationDto[]> {
  return fakeLatency(integrationsStore().map(cloneIntegration));
}

export function connectIntegration(key: IntegrationKeyDto): Promise<IntegrationDto> {
  const updated = patchIntegration(key, {
    status: 'connected',
    enabled: true,
    connectedAccount: CURRENT_ACCOUNT,
    connectedAt: new Date().toISOString(),
    errorCode: null,
  });
  return fakeLatency(cloneIntegration(updated));
}

export function disconnectIntegration(key: IntegrationKeyDto): Promise<IntegrationDto> {
  const updated = patchIntegration(key, {
    status: 'disconnected',
    enabled: false,
    connectedAccount: null,
    connectedAt: null,
    lastSyncAt: null,
    errorCode: null,
  });
  return fakeLatency(cloneIntegration(updated));
}

export function setIntegrationEnabled(key: IntegrationKeyDto, enabled: boolean): Promise<IntegrationDto> {
  return fakeLatency(cloneIntegration(patchIntegration(key, { enabled })));
}

export function updateIntegrationSettings(
  key: IntegrationKeyDto,
  settings: Record<string, IntegrationSettingValueDto>,
): Promise<IntegrationDto> {
  const current = requireIntegration(key);
  const updated = patchIntegration(key, { settings: { ...current.settings, ...settings } });
  return fakeLatency(cloneIntegration(updated));
}

export function testIntegration(key: IntegrationKeyDto): Promise<{ ok: boolean }> {
  const integration = requireIntegration(key);
  return fakeLatency({ ok: integration.status !== 'error' });
}
