import type { ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { theme } from 'antd';
import type { DayDropData } from '../model/dragData';

export interface DayCellProps {
  date: string;
  header: ReactNode;
  muted?: boolean;
  children: ReactNode;
}

export function DayCell({ date, header, muted, children }: DayCellProps) {
  const { token } = theme.useToken();
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${date}`,
    data: { date } satisfies DayDropData,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        height: '100%',
        minHeight: 0,
        padding: 6,
        background: isOver ? token.colorPrimaryBg : token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        opacity: muted ? 0.55 : 1,
      }}
    >
      {header}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
}
