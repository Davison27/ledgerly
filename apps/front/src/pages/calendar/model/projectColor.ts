import { CHART_SERIES_DARK, CHART_SERIES_LIGHT } from '@/shared/config/theme';

function hashProjectId(projectId: string): number {
  let hash = 0;
  for (let i = 0; i < projectId.length; i += 1) {
    hash = (hash * 31 + projectId.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function projectColor(projectId: string, isDark: boolean): string {
  const palette = isDark ? CHART_SERIES_DARK : CHART_SERIES_LIGHT;
  return palette[hashProjectId(projectId) % palette.length];
}
