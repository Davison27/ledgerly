import type { IntegrationFamilyDto, IntegrationKeyDto } from '../api/types';

export const INTEGRATION_SETTING_KEYS = [
  'calendar',
  'folder',
  'spreadsheet',
  'mailbox',
  'label',
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

const GOOGLE_CALENDAR_OPTIONS = ['calendar.ledgerly', 'calendar.personal', 'calendar.projects'] as const;
const GOOGLE_DRIVE_FOLDER_OPTIONS = [
  'folder.ledgerly-documents',
  'folder.accounting-2026',
  'folder.shared',
] as const;
const GMAIL_LABEL_OPTIONS = ['label.invoices', 'label.suppliers', 'label.ledgerly'] as const;
const GOOGLE_SHEETS_OPTIONS = ['spreadsheet.ledgerly-invoicing', 'spreadsheet.expenses-2026'] as const;
const GOOGLE_CONTACT_GROUP_OPTIONS = ['contactGroup.suppliers', 'contactGroup.customers', 'contactGroup.all'] as const;
const GOOGLE_SYNC_DIRECTION_OPTIONS = [
  'syncDirection.ledgerly-to-google',
  'syncDirection.google-to-ledgerly',
  'syncDirection.bidirectional',
] as const;
const NOTIFICATION_EVENT_OPTIONS = ['events.all', 'events.errors', 'events.deadlines'] as const;
const CALENDAR_MODE_OPTIONS = ['syncDirection.ics-read-only', 'syncDirection.caldav-bidirectional'] as const;
const MAIL_SECURITY_OPTIONS = ['security.starttls', 'security.ssl-tls', 'security.none'] as const;

export const INTEGRATION_CATALOG: readonly IntegrationCatalogEntry[] = [
  {
    key: 'google-calendar',
    family: 'google',
    auth: 'oauth',
    fields: [
      { key: 'calendar', kind: 'select', options: GOOGLE_CALENDAR_OPTIONS },
      { key: 'syncDirection', kind: 'select', options: GOOGLE_SYNC_DIRECTION_OPTIONS },
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
        options: GOOGLE_DRIVE_FOLDER_OPTIONS,
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
      { key: 'label', kind: 'select', options: GMAIL_LABEL_OPTIONS },
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
        options: GOOGLE_SHEETS_OPTIONS,
      },
    ],
  },
  {
    key: 'google-contacts',
    family: 'google',
    auth: 'oauth',
    fields: [
      { key: 'contactGroup', kind: 'select', options: GOOGLE_CONTACT_GROUP_OPTIONS },
      { key: 'syncDirection', kind: 'select', options: GOOGLE_SYNC_DIRECTION_OPTIONS },
    ],
  },
  {
    key: 'outgoing-webhooks',
    family: 'open',
    auth: 'internal',
    fields: [
      { key: 'webhookUrl', kind: 'text', required: true },
      { key: 'events', kind: 'select', options: NOTIFICATION_EVENT_OPTIONS },
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
        options: CALENDAR_MODE_OPTIONS,
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
      { key: 'security', kind: 'select', options: MAIL_SECURITY_OPTIONS },
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
  'open',
];

export function catalogEntry(key: IntegrationKeyDto): IntegrationCatalogEntry {
  const entry = INTEGRATION_CATALOG.find((item) => item.key === key);
  if (!entry) throw new Error('integration_not_found');
  return entry;
}
