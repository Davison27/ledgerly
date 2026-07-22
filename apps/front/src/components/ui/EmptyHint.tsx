import type { ReactNode } from 'react';
import { Flex, Typography, theme } from 'antd';
import { TYPE } from '../../app/theme/tokens';

const { Text } = Typography;

export interface EmptyHintProps {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}

/** Bloque centrado para estados vacíos, en lugar de texto gris suelto. */
export function EmptyHint({ icon, title, hint, action }: EmptyHintProps) {
  const { token } = theme.useToken();

  return (
    <Flex vertical align="center" gap={8} style={{ padding: '32px 16px', textAlign: 'center' }}>
      <span style={{ fontSize: 20, color: token.colorTextQuaternary, display: 'flex' }}>{icon}</span>
      <Text style={{ ...TYPE.caption, color: token.colorTextSecondary }}>{title}</Text>
      {hint && <Text style={{ ...TYPE.caption, color: token.colorTextTertiary }}>{hint}</Text>}
      {action}
    </Flex>
  );
}
