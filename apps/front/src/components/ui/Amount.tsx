import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useSemanticColors } from '../../app/theme/useSemanticColors';
import { TYPE } from '../../app/theme/tokens';

export interface AmountProps {
  value: number;
  currency?: string; // default 'EUR'
  maximumFractionDigits?: number; // default 0
  tone?: 'default' | 'income' | 'expense' | 'auto'; // 'auto': income si >=0
  strong?: boolean;
  size?: number; // fontSize opcional
}

const LOCALE_BY_LANGUAGE: Record<string, string> = { es: 'es-ES', en: 'en-US' };

/** Importe con `tabular-nums` siempre aplicado. Único formateador de dinero de la app. */
export function Amount({
  value,
  currency = 'EUR',
  maximumFractionDigits = 0,
  tone = 'default',
  strong = false,
  size,
}: AmountProps) {
  const { i18n } = useTranslation();
  const colors = useSemanticColors();

  const resolvedTone = tone === 'auto' ? (value >= 0 ? 'income' : 'expense') : tone;
  const color =
    resolvedTone === 'income'
      ? colors.income
      : resolvedTone === 'expense'
        ? colors.expense
        : undefined;

  const locale = LOCALE_BY_LANGUAGE[i18n.resolvedLanguage ?? 'es'] ?? 'es-ES';
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits,
  }).format(value);

  const style: CSSProperties = {
    ...TYPE.numeric,
    color,
    fontWeight: strong ? 600 : undefined,
    fontSize: size,
  };

  return <span style={style}>{formatted}</span>;
}
