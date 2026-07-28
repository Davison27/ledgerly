import type { IntegrationFamilyDto, IntegrationKeyDto } from '../api/types';

export const INTEGRATION_SETTING_KEYS = [
  'calendar',
  'folder',
  'spreadsheet',
  'mailbox',
  'label',
  'channel',
  'chatId',
  'webhookUrl',
  'feedUrl',
  'events',
  'host',
  'port',
  'username',
  'password',
  'security',
  'apiKey',
  'syncDirection',
  'contactGroup',
  'autoArchive',
  'notifyOnError',
] as const;
export type IntegrationSettingKeyDto = (typeof INTEGRATION_SETTING_KEYS)[number];

export type IntegrationSettingField =
  | { key: IntegrationSettingKeyDto; kind: 'select'; options: readonly string[]; required?: boolean }
  | { key: IntegrationSettingKeyDto; kind: 'text'; required?: boolean }
  | { key: IntegrationSettingKeyDto; kind: 'secret'; required?: boolean }
  | { key: IntegrationSettingKeyDto; kind: 'toggle' }
  | { key: IntegrationSettingKeyDto; kind: 'copy' };

export interface IntegrationCatalogEntry {
  key: IntegrationKeyDto;
  family: IntegrationFamilyDto;
  auth: 'oauth' | 'credentials' | 'internal';
  fields: readonly IntegrationSettingField[];
}

const SYNC_DIRECTION_TO_GOOGLE = ['Ledgerly → Google', 'Google → Ledgerly', 'Bidireccional'] as const;
const NOTIFICATION_EVENTS = ['Todos los avisos', 'Solo errores', 'Solo vencimientos'] as const;

export const INTEGRATION_CATALOG: readonly IntegrationCatalogEntry[] = [
  {
    key: 'google-calendar',
    family: 'google',
    auth: 'oauth',
    fields: [
      { key: 'calendar', kind: 'select', options: ['Ledgerly · Agenda', 'Personal', 'Obras'] },
      { key: 'syncDirection', kind: 'select', options: SYNC_DIRECTION_TO_GOOGLE },
      { key: 'notifyOnError', kind: 'toggle' },
    ],
  },
  {
    key: 'google-drive',
    family: 'google',
    auth: 'oauth',
    fields: [
      {
        key: 'folder',
        kind: 'select',
        options: ['/Ledgerly/Documentos', '/Contabilidad/2026', '/Compartido'],
      },
      { key: 'autoArchive', kind: 'toggle' },
    ],
  },
  {
    key: 'gmail',
    family: 'google',
    auth: 'oauth',
    fields: [
      { key: 'mailbox', kind: 'text' },
      { key: 'label', kind: 'select', options: ['facturas', 'proveedores', 'ledgerly'] },
    ],
  },
  {
    key: 'google-sheets',
    family: 'google',
    auth: 'oauth',
    fields: [
      {
        key: 'spreadsheet',
        kind: 'select',
        options: ['Ledgerly · Facturación', 'Gastos 2026'],
      },
    ],
  },
  {
    key: 'google-contacts',
    family: 'google',
    auth: 'oauth',
    fields: [
      { key: 'contactGroup', kind: 'select', options: ['Proveedores', 'Clientes', 'Todos'] },
      { key: 'syncDirection', kind: 'select', options: SYNC_DIRECTION_TO_GOOGLE },
    ],
  },
  {
    key: 'outlook-calendar',
    family: 'microsoft',
    auth: 'oauth',
    fields: [
      { key: 'calendar', kind: 'select', options: ['Calendario', 'Ledgerly · Agenda'] },
      { key: 'syncDirection', kind: 'select', options: SYNC_DIRECTION_TO_GOOGLE },
    ],
  },
  {
    key: 'onedrive',
    family: 'microsoft',
    auth: 'oauth',
    fields: [
      { key: 'folder', kind: 'select', options: ['/Ledgerly', '/Documentos/Facturas'] },
      { key: 'autoArchive', kind: 'toggle' },
    ],
  },
  {
    key: 'excel-online',
    family: 'microsoft',
    auth: 'oauth',
    fields: [
      { key: 'spreadsheet', kind: 'select', options: ['Ledgerly.xlsx', 'Informes 2026.xlsx'] },
    ],
  },
  {
    key: 'slack',
    family: 'communication',
    auth: 'oauth',
    fields: [
      { key: 'channel', kind: 'select', options: ['#facturacion', '#general', '#avisos'] },
      { key: 'events', kind: 'select', options: NOTIFICATION_EVENTS },
      { key: 'notifyOnError', kind: 'toggle' },
    ],
  },
  {
    key: 'telegram',
    family: 'communication',
    auth: 'credentials',
    fields: [
      { key: 'chatId', kind: 'text', required: true },
      { key: 'apiKey', kind: 'secret', required: true },
      { key: 'events', kind: 'select', options: NOTIFICATION_EVENTS },
    ],
  },
  {
    key: 'discord',
    family: 'communication',
    auth: 'credentials',
    fields: [
      { key: 'webhookUrl', kind: 'text', required: true },
      { key: 'events', kind: 'select', options: NOTIFICATION_EVENTS },
    ],
  },
  {
    key: 'outgoing-webhooks',
    family: 'open',
    auth: 'internal',
    fields: [
      { key: 'webhookUrl', kind: 'text', required: true },
      { key: 'events', kind: 'select', options: NOTIFICATION_EVENTS },
      { key: 'apiKey', kind: 'secret' },
    ],
  },
  {
    key: 'calendar-feed',
    family: 'open',
    auth: 'internal',
    fields: [
      { key: 'feedUrl', kind: 'copy' },
      {
        key: 'syncDirection',
        kind: 'select',
        options: ['Solo lectura (ICS)', 'Bidireccional (CalDAV)'],
      },
    ],
  },
  {
    key: 'smtp-imap',
    family: 'open',
    auth: 'credentials',
    fields: [
      { key: 'host', kind: 'text', required: true },
      { key: 'port', kind: 'text', required: true },
      { key: 'security', kind: 'select', options: ['STARTTLS', 'SSL/TLS', 'Ninguna'] },
      { key: 'username', kind: 'text', required: true },
      { key: 'password', kind: 'secret', required: true },
    ],
  },
  {
    key: 'api-keys',
    family: 'open',
    auth: 'internal',
    fields: [{ key: 'apiKey', kind: 'copy' }],
  },
];

export const INTEGRATION_FAMILIES: readonly IntegrationFamilyDto[] = [
  'google',
  'microsoft',
  'communication',
  'open',
];

export function catalogEntry(key: IntegrationKeyDto): IntegrationCatalogEntry {
  const entry = INTEGRATION_CATALOG.find((item) => item.key === key);
  if (!entry) throw new Error('integration_not_found');
  return entry;
}
