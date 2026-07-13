import { USE_MOCKS } from '../config';
import { mockTeam, mockIntegrations } from './mocks/projectSettings.mock';

export type { TeamMember, Integration } from './mocks/projectSettings.mock';

export function getProjectTeam() {
  return USE_MOCKS ? mockTeam : [];
}

export function getProjectIntegrations() {
  return USE_MOCKS ? mockIntegrations : [];
}
