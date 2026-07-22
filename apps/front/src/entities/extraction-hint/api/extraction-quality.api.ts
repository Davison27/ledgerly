import { get } from '@/shared/api/httpClient';
import type { ExtractionQualityDto } from './types';

export function getExtractionQuality(): Promise<ExtractionQualityDto> {
  return get<ExtractionQualityDto>('/extraction-quality');
}
