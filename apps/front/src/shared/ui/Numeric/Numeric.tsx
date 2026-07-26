import type { CSSProperties, ReactNode } from 'react';
import typography from '../typography.module.css';

export interface NumericProps {
  children: ReactNode;
  style?: CSSProperties;
}

export function Numeric({ children, style }: NumericProps) {
  return (
    <span className={typography.numeric} style={style}>
      {children}
    </span>
  );
}
