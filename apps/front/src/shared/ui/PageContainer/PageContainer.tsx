import type { ReactNode } from 'react';
import { LAYOUT } from '../../config/theme';

export interface PageContainerProps {
  children: ReactNode;
  maxWidth?: number | string;
}

export function PageContainer({ children, maxWidth }: PageContainerProps) {
  return (
    <div
      style={{
        padding: `${LAYOUT.pagePaddingBlock}px ${LAYOUT.pagePaddingInline}px`,
        width: '100%',
        maxWidth: maxWidth ?? LAYOUT.contentMaxWidth,
        marginInline: 'auto',
      }}
    >
      {children}
    </div>
  );
}
