import type { IntegrationDto, IntegrationKeyDto } from './types';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function isoHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * HOUR_MS).toISOString();
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function disconnected(key: IntegrationKeyDto, family: IntegrationDto['family']): IntegrationDto {
  return {
    key,
    family,
    status: 'disconnected',
    enabled: false,
    connectedAccount: null,
    connectedAt: null,
    lastSyncAt: null,
    errorCode: null,
    settings: {},
  };
}

let integrations: IntegrationDto[] = [
  {
    key: 'google-calendar',
    family: 'google',
    status: 'connected',
    enabled: true,
    connectedAccount: 'david@ledgerly.es',
    connectedAt: isoDaysAgo(40),
    lastSyncAt: isoHoursAgo(2),
    errorCode: null,
    settings: {
      calendar: 'calendar.ledgerly',
      syncDirection: 'syncDirection.bidirectional',
      notifyOnError: true,
    },
  },
  disconnected('google-drive', 'google'),
  {
    key: 'gmail',
    family: 'google',
    status: 'error',
    enabled: true,
    connectedAccount: 'facturas@ledgerly.es',
    connectedAt: isoDaysAgo(60),
    lastSyncAt: isoDaysAgo(5),
    errorCode: 'token_expired',
    settings: { mailbox: 'facturas@ledgerly.es', label: 'label.invoices' },
  },
  disconnected('google-sheets', 'google'),
  disconnected('google-contacts', 'google'),
  disconnected('outgoing-webhooks', 'open'),
  {
    key: 'calendar-feed',
    family: 'open',
    status: 'connected',
    enabled: true,
    connectedAccount: null,
    connectedAt: isoDaysAgo(20),
    lastSyncAt: null,
    errorCode: null,
    settings: {
      feedUrl: 'https://ledgerly.app/feeds/workspace-a1b2c3.ics',
      syncDirection: 'syncDirection.ics-read-only',
    },
  },
  disconnected('smtp-imap', 'open'),
  {
    key: 'api-keys',
    family: 'open',
    status: 'connected',
    enabled: true,
    connectedAccount: null,
    connectedAt: isoDaysAgo(90),
    lastSyncAt: null,
    errorCode: null,
    settings: { apiKey: 'lgy_live_4f9c2b7a1e6d4c3f9a0b8e7d6c5b4a39' },
  },
];

export function integrationsStore(): IntegrationDto[] {
  return integrations;
}

export function findIntegration(key: IntegrationKeyDto): IntegrationDto | undefined {
  return integrations.find((integration) => integration.key === key);
}

export function patchIntegration(key: IntegrationKeyDto, patch: Partial<IntegrationDto>): IntegrationDto {
  const index = integrations.findIndex((integration) => integration.key === key);
  if (index === -1) throw new Error('integration_not_found');
  const updated = { ...integrations[index], ...patch };
  integrations = integrations.map((integration, i) => (i === index ? updated : integration));
  return updated;
}
