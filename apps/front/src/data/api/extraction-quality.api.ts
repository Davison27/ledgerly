import { get } from './httpClient';
import type { ExtractionQualityDto } from './types';

export function getExtractionQuality(): Promise<ExtractionQualityDto> {
  return get<ExtractionQualityDto>('/extraction-quality');
}
