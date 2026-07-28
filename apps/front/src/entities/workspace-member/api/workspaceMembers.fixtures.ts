import { matrixForRole } from '../model/permissions';
import type { PermissionMatrixDto, WorkspaceMemberDto } from './types';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * MINUTE_MS).toISOString();
}

function isoHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * HOUR_MS).toISOString();
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function isoWeeksAgo(weeks: number): string {
  return new Date(Date.now() - weeks * WEEK_MS).toISOString();
}

const LUIS_CUSTOM_MATRIX: PermissionMatrixDto = {
  dashboard: 'view',
  projects: 'edit',
  calendar: 'view',
  documents: 'edit',
  suppliers: 'view',
  invoices: 'edit',
  products: 'view',
  staff: 'none',
};

let members: WorkspaceMemberDto[] = [
  {
    id: 'wm-1',
    name: 'David Pérez',
    email: 'david@ledgerly.es',
    role: 'admin',
    permissions: matrixForRole('admin'),
    status: 'active',
    invitedAt: isoWeeksAgo(26),
    joinedAt: isoWeeksAgo(26),
    lastActiveAt: isoMinutesAgo(4),
  },
  {
    id: 'wm-2',
    name: 'Marta Ruiz',
    email: 'marta@ledgerly.es',
    role: 'editor',
    permissions: matrixForRole('editor'),
    status: 'active',
    invitedAt: isoWeeksAgo(20),
    joinedAt: isoWeeksAgo(19),
    lastActiveAt: isoHoursAgo(3),
  },
  {
    id: 'wm-3',
    name: 'Luis Gámez',
    email: 'luis@ledgerly.es',
    role: 'custom',
    permissions: LUIS_CUSTOM_MATRIX,
    status: 'active',
    invitedAt: isoWeeksAgo(14),
    joinedAt: isoWeeksAgo(13),
    lastActiveAt: isoDaysAgo(1),
  },
  {
    id: 'wm-4',
    name: 'Nuria Sanz',
    email: 'nuria@ledgerly.es',
    role: 'viewer',
    permissions: matrixForRole('viewer'),
    status: 'active',
    invitedAt: isoWeeksAgo(10),
    joinedAt: isoWeeksAgo(10),
    lastActiveAt: isoWeeksAgo(2),
  },
  {
    id: 'wm-5',
    name: 'Iván Melero',
    email: 'ivan@ledgerly.es',
    role: 'editor',
    permissions: matrixForRole('editor'),
    status: 'invited',
    invitedAt: isoDaysAgo(2),
    joinedAt: null,
    lastActiveAt: null,
  },
  {
    id: 'wm-6',
    name: 'Carla Ortiz',
    email: 'carla@ledgerly.es',
    role: 'viewer',
    permissions: matrixForRole('viewer'),
    status: 'disabled',
    invitedAt: isoWeeksAgo(30),
    joinedAt: isoWeeksAgo(29),
    lastActiveAt: isoWeeksAgo(6),
  },
];

export function membersStore(): WorkspaceMemberDto[] {
  return members;
}

export function findMember(id: string): WorkspaceMemberDto | undefined {
  return members.find((member) => member.id === id);
}

export function findMemberByEmail(email: string): WorkspaceMemberDto | undefined {
  const normalized = email.trim().toLowerCase();
  return members.find((member) => member.email.toLowerCase() === normalized);
}

export function insertMember(member: WorkspaceMemberDto): void {
  members = [...members, member];
}

export function patchMember(id: string, patch: Partial<WorkspaceMemberDto>): WorkspaceMemberDto {
  const index = members.findIndex((member) => member.id === id);
  if (index === -1) throw new Error('member_not_found');
  const updated = { ...members[index], ...patch };
  members = members.map((member, i) => (i === index ? updated : member));
  return updated;
}

export function removeMember(id: string): void {
  members = members.filter((member) => member.id !== id);
}
