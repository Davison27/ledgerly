import type { ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { ScheduleEventDto } from '@/entities/schedule-event';
import type { CalendarDragData, DayDropData } from '../model/dragData';

export interface CalendarDndContextProps {
  children: ReactNode;
  onDropProject: (projectId: string, date: string) => void;
  onMoveEvent: (event: ScheduleEventDto, offsetInDays: number) => void;
  onResizeEvent: (event: ScheduleEventDto, edge: 'start' | 'end', date: string) => void;
}

function eventLabel(event: ScheduleEventDto): string {
  return event.title?.trim() || event.project.name;
}

export function CalendarDndContext({
  children,
  onDropProject,
  onMoveEvent,
  onResizeEvent,
}: CalendarDndContextProps) {
  const { t } = useTranslation();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const announcements: Announcements = {
    onDragStart({ active }) {
      const data = active.data.current as CalendarDragData | undefined;
      if (!data) return undefined;
      if (data.kind === 'project') {
        return t('calendar.dnd.announcements.pickedUpProject', { name: data.projectName });
      }
      if (data.kind === 'event') {
        return t('calendar.dnd.announcements.pickedUpEvent', { name: eventLabel(data.event) });
      }
      return t('calendar.dnd.announcements.pickedUpResize', { name: eventLabel(data.event) });
    },
    onDragOver({ over }) {
      const date = (over?.data.current as DayDropData | undefined)?.date;
      return date ? t('calendar.dnd.announcements.over', { date }) : undefined;
    },
    onDragEnd({ active, over }) {
      const data = active.data.current as CalendarDragData | undefined;
      const date = (over?.data.current as DayDropData | undefined)?.date;
      if (!data || !date) return t('calendar.dnd.announcements.cancelled');
      return t('calendar.dnd.announcements.dropped', { date });
    },
    onDragCancel() {
      return t('calendar.dnd.announcements.cancelled');
    },
  };

  const handleDragEnd = (dragEndEvent: DragEndEvent) => {
    const { active, over } = dragEndEvent;
    if (!over) return;

    const data = active.data.current as CalendarDragData | undefined;
    const dropData = over.data.current as DayDropData | undefined;
    if (!data || !dropData) return;

    if (data.kind === 'project') {
      onDropProject(data.projectId, dropData.date);
      return;
    }

    if (data.kind === 'event') {
      const offset = dayjs(dropData.date).diff(dayjs(data.date), 'day');
      if (offset !== 0) onMoveEvent(data.event, offset);
      return;
    }

    onResizeEvent(data.event, data.edge, dropData.date);
  };

  return (
    <DndContext sensors={sensors} accessibility={{ announcements }} onDragEnd={handleDragEnd}>
      {children}
    </DndContext>
  );
}
