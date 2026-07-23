import type { ScheduleEventDto } from '@/entities/schedule-event';

export type AgendaStatus = 'current' | 'upcoming' | 'past';

export interface AgendaGroup {
  status: AgendaStatus;
  events: ScheduleEventDto[];
}

export interface AgendaStats {
  blocks: number;
  days: number;
  projects: number;
}

const GROUP_ORDER: AgendaStatus[] = ['current', 'upcoming', 'past'];

export function agendaStatus(event: ScheduleEventDto, today: string): AgendaStatus {
  if (event.endDate < today) return 'past';
  if (event.startDate > today) return 'upcoming';
  return 'current';
}

export function groupAgenda(events: ScheduleEventDto[], today: string): AgendaGroup[] {
  const byStatus = new Map<AgendaStatus, ScheduleEventDto[]>();

  for (const event of events) {
    const status = agendaStatus(event, today);
    const group = byStatus.get(status);
    if (group) {
      group.push(event);
    } else {
      byStatus.set(status, [event]);
    }
  }

  return GROUP_ORDER.filter((status) => byStatus.has(status)).map((status) => {
    const groupEvents = [...byStatus.get(status)!];
    groupEvents.sort((a, b) =>
      status === 'past'
        ? b.startDate.localeCompare(a.startDate)
        : a.startDate.localeCompare(b.startDate),
    );
    return { status, events: groupEvents };
  });
}

export function agendaStats(events: ScheduleEventDto[]): AgendaStats {
  const days = events.reduce((total, event) => total + event.days.length, 0);
  const projects = new Set(events.map((event) => event.projectId)).size;
  return { blocks: events.length, days, projects };
}
