import { USE_MOCKS } from '../config';
import { mockEnterprises, type Enterprise } from './mocks/enterprises.mock';

export type { Enterprise, Project } from './mocks/enterprises.mock';

export const enterprises: Enterprise[] = USE_MOCKS ? mockEnterprises : [];

export function getEnterprise(id: string): Enterprise | undefined {
  return enterprises.find((e) => e.id === id);
}
