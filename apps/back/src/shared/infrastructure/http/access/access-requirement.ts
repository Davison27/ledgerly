import { PermissionLevel, WorkspaceModule } from '../../../../contexts/auth/domain/value-objects/permission-matrix';

export const ACCESS_REQUIREMENT_KEY = 'auth:accessRequirement';

export type AccessRequirement =
  | { kind: 'authenticated' }
  | { kind: 'admin' }
  | { kind: 'access'; module: WorkspaceModule; level: PermissionLevel };
