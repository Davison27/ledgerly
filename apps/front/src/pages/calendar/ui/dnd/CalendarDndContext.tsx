import { useState, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { SchedulableProjectDto, ScheduleEventDto } from '@/entities/schedule-event';
import type { CalendarDragData, CalendarDropData } from '../../model/dragData';
import { CalendarDragPreview } from '../dragPreview/CalendarDragPreview';

export interface CalendarDndContextProps {
  children: ReactNode;
  colorForProject: (projectId: string, color: string | null) => string;
  onDropProject: (projectId: string, date: string) => void;
  onDropDerivedProject: (project: SchedulableProjectDto, offsetInDays: number) => void;
  onMoveEvent: (event: ScheduleEventDto, offsetInDays: number) => void;
  onResizeEvent: (event: ScheduleEventDto, edge: 'start' | 'end', date: string) => void;
  onAssignStaff: (eventId: string, staffMemberId: string) => void;
}

function eventLabel(event: ScheduleEventDto): string {
  return event.title?.trim() || event.project.name;
}

const collisionDetection: CollisionDetection = (args) => {
  const activeData = args.active.data.current as CalendarDragData | undefined;
  const acceptedKinds: CalendarDropData['kind'][] = activeData?.kind === 'staff' ? ['event'] : ['day'];

  const filteredContainers = args.droppableContainers.filter((container) => {
    const data = container.data.current as CalendarDropData | undefined;
    return data ? acceptedKinds.includes(data.kind) : false;
  });

  const pointerCollisions = pointerWithin({ ...args, droppableContainers: filteredContainers });
  if (pointerCollisions.length > 0) return pointerCollisions;
  return rectIntersection({ ...args, droppableContainers: filteredContainers });
};

export function CalendarDndContext({
  children,
  colorForProject,
  onDropProject,
  onDropDerivedProject,
  onMoveEvent,
  onResizeEvent,
  onAssignStaff,
}: CalendarDndContextProps) {
  const { t } = useTranslation();
  const [active, setActive] = useState<CalendarDragData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = ({ active: activeDraggable }: DragStartEvent) => {
    setActive((activeDraggable.data.current as CalendarDragData | undefined) ?? null);
  };

  const announcements: Announcements = {
    onDragStart({ active: activeDraggable }) {
      const data = activeDraggable.data.current as CalendarDragData | undefined;
      if (!data) return undefined;
      switch (data.kind) {
        case 'project':
          return t('calendar.dnd.announcements.pickedUpProject', { name: data.project.name });
        case 'derived':
          return t('calendar.dnd.announcements.pickedUpProject', { name: data.project.name });
        case 'event':
          return t('calendar.dnd.announcements.pickedUpEvent', { name: eventLabel(data.event) });
        case 'resize':
          return t('calendar.dnd.announcements.pickedUpResize', { name: eventLabel(data.event) });
        case 'staff':
          return t('calendar.dnd.announcements.pickedUpStaff', { name: data.name });
        default:
          return undefined;
      }
    },
    onDragOver({ over }) {
      const data = over?.data.current as CalendarDropData | undefined;
      return data?.kind === 'day' ? t('calendar.dnd.announcements.over', { date: data.date }) : undefined;
    },
    onDragEnd({ active: activeDraggable, over }) {
      const data = activeDraggable.data.current as CalendarDragData | undefined;
      const dropData = over?.data.current as CalendarDropData | undefined;
      if (!data || !dropData) return t('calendar.dnd.announcements.cancelled');
      return dropData.kind === 'day'
        ? t('calendar.dnd.announcements.dropped', { date: dropData.date })
        : t('calendar.dnd.announcements.droppedOnEvent');
    },
    onDragCancel() {
      return t('calendar.dnd.announcements.cancelled');
    },
  };

  const handleDragEnd = (dragEndEvent: DragEndEvent) => {
    try {
      const { active: activeDraggable, over } = dragEndEvent;
      if (!over) return;

      const data = activeDraggable.data.current as CalendarDragData | undefined;
      const dropData = over.data.current as CalendarDropData | undefined;
      if (!data || !dropData) return;

      if (data.kind === 'staff') {
        if (dropData.kind === 'event') onAssignStaff(dropData.eventId, data.staffMemberId);
        return;
      }

      if (dropData.kind !== 'day') return;

      if (data.kind === 'project') {
        onDropProject(data.project.id, dropData.date);
        return;
      }

      if (data.kind === 'derived') {
        const offset = dayjs(dropData.date).diff(dayjs(data.project.startDate ?? data.project.endDate ?? dropData.date), 'day');
        onDropDerivedProject(data.project, offset);
        return;
      }

      if (data.kind === 'event') {
        const offset = dayjs(dropData.date).diff(dayjs(data.date), 'day');
        if (offset !== 0) onMoveEvent(data.event, offset);
        return;
      }

      onResizeEvent(data.event, data.edge, dropData.date);
    } finally {
      setActive(null);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      accessibility={{ announcements }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActive(null)}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {active ? <CalendarDragPreview data={active} colorForProject={colorForProject} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
