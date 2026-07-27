import { useId } from 'react';
import styles from './Sparkline.module.css';

export interface SparklineProps {
  data: number[];
  color: string;
  fill?: string;
  height?: number;
  strokeWidth?: number;
}

const WIDTH = 100;

export function Sparkline({ data, color, fill, height = 40, strokeWidth = 2 }: SparklineProps) {
  const gradientId = useId();

  if (data.length === 0) return null;

  const max = Math.max(...data, 0);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const lastIndex = Math.max(1, data.length - 1);

  const x = (i: number) => (WIDTH * i) / lastIndex;
  const y = (v: number) => height - ((v - min) / range) * height;

  const points = data.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const areaPath = `M ${x(0)},${height} L ${data
    .map((v, i) => `${x(i)},${y(v)}`)
    .join(' L ')} L ${x(data.length - 1)},${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="presentation"
      className={styles.svg}
    >
      {fill && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity={0.28} />
            <stop offset="100%" stopColor={fill} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}

      {fill && <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />}

      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
