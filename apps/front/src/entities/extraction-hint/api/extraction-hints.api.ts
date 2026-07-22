import { del, get } from '@/shared/api/httpClient';
import type { ExtractionHintDto } from './types';

export function listExtractionHints(): Promise<ExtractionHintDto[]> {
  return get<ExtractionHintDto[]>('/extraction-hints');
}

export function deleteExtractionHint(id: string): Promise<void> {
  return del<void>(`/extraction-hints/${id}`);
}
