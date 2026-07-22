import type { CSSProperties, ReactNode } from 'react';
import { TYPE } from '../../config/theme';

export interface NumericProps {
  children: ReactNode;
  style?: CSSProperties;
}

export function Numeric({ children, style }: NumericProps) {
  return <span style={{ ...TYPE.numeric, ...style }}>{children}</span>;
}
