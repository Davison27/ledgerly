import { post } from './httpClient';

export interface LoadDemoDataResult {
  created: boolean;
  projectId: string | null;
  documentCount: number;
}

export function loadDemoData(): Promise<LoadDemoDataResult> {
  return post<LoadDemoDataResult>('/demo');
}
