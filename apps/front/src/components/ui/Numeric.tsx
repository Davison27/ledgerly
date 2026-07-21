import type { CSSProperties, ReactNode } from 'react';
import { TYPE } from '../../app/theme/tokens';

export interface NumericProps {
  children: ReactNode;
  style?: CSSProperties;
}

/** Aplica `tabular-nums` a contadores/porcentajes que no son importes. */
export function Numeric({ children, style }: NumericProps) {
  return <span style={{ ...TYPE.numeric, ...style }}>{children}</span>;
}
