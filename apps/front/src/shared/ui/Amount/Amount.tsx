import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useSemanticColors } from '../../lib/useSemanticColors';
import typography from '../typography.module.css';

export interface AmountProps {
  value: number;
  currency?: string;
  maximumFractionDigits?: number;
  tone?: 'default' | 'income' | 'expense' | 'auto';
  strong?: boolean;
  size?: number;
}

const LOCALE_BY_LANGUAGE: Record<string, string> = { es: 'es-ES', en: 'en-US' };

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
    color,
    fontWeight: strong ? 600 : undefined,
    fontSize: size,
  };

  return (
    <span className={typography.numeric} style={style}>
      {formatted}
    </span>
  );
}
