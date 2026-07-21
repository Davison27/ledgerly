import type { ReactNode } from 'react';
import { Tag, theme } from 'antd';
import { useSemanticColors } from '../../app/theme/useSemanticColors';

export type SemanticTone =
  | 'income'
  | 'expense'
  | 'paid'
  | 'pending'
  | 'overdue'
  | 'info'
  | 'neutral';

export interface SemanticTagProps {
  tone: SemanticTone;
  children: ReactNode;
}

/**
 * Único sitio donde se define el aspecto de un tag de estado en toda la app:
 * `Tag.ComponentToken` de AntD v6 no expone radio ni padding, así que cualquier
 * `<Tag>` de estado nuevo debe pasar por aquí.
 */
export function SemanticTag({ tone, children }: SemanticTagProps) {
  const { token } = theme.useToken();
  const colors = useSemanticColors();

  const { color, background } = (() => {
    switch (tone) {
      case 'income':
        return { color: colors.income, background: colors.incomeBg };
      case 'expense':
        return { color: colors.expense, background: colors.expenseBg };
      case 'paid':
        return { color: colors.paid, background: colors.incomeBg };
      case 'pending':
        return { color: colors.pending, background: colors.pendingBg };
      case 'overdue':
        return { color: colors.overdue, background: colors.overdueBg };
      case 'info':
        return { color: token.colorPrimary, background: token.colorPrimaryBg };
      case 'neutral':
      default:
        return { color: token.colorText, background: token.colorFillTertiary };
    }
  })();

  return (
    <Tag
      bordered={false}
      style={{
        borderRadius: token.borderRadiusSM,
        padding: '1px 8px',
        fontSize: 12,
        fontWeight: 500,
        marginInlineEnd: 0,
        lineHeight: '20px',
        color,
        background,
      }}
    >
      {children}
    </Tag>
  );
}
