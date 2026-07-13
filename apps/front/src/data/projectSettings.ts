import { USE_MOCKS } from '../config';
import { mockTeam, mockIntegrations } from './mocks/projectSettings.mock';

export type { TeamMember, Integration } from './mocks/projectSettings.mock';

// Fuente de datos de configuración de proyecto.
// TODO: sustituir por llamadas al backend cuando esté disponible.
// De momento solo hay mocks, que únicamente se cargan en modo local.
export function getProjectTeam() {
  return USE_MOCKS ? mockTeam : [];
}

export function getProjectIntegrations() {
  return USE_MOCKS ? mockIntegrations : [];
}
