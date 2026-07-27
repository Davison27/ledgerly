import type { ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { CalendarDropData } from '../model/dragData';
import styles from './DayCell.module.css';

export interface DayCellProps {
  date: string;
  header: ReactNode;
  muted?: boolean;
}

export function DayCell({ date, header, muted }: DayCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${date}`,
    data: { kind: 'day', date } satisfies CalendarDropData,
  });

  return (
    <div ref={setNodeRef} className={styles.cell} data-over={isOver} data-muted={muted}>
      {header}
    </div>
  );
}
