import type { ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { theme } from 'antd';
import type { CalendarDropData } from '../model/dragData';

export interface DayCellProps {
  date: string;
  header: ReactNode;
  muted?: boolean;
}

export function DayCell({ date, header, muted }: DayCellProps) {
  const { token } = theme.useToken();
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${date}`,
    data: { kind: 'day', date } satisfies CalendarDropData,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 6,
        background: isOver ? token.colorPrimaryBg : token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        opacity: muted ? 0.55 : 1,
      }}
    >
      {header}
    </div>
  );
}
