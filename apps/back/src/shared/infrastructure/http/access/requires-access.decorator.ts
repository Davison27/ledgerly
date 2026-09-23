import { PermissionLevel, WorkspaceModule } from '../../../../contexts/auth/domain/value-objects/permission-matrix';
import { appendAccessRequirement } from './access-requirement';

export const RequiresAccess = (module: WorkspaceModule, level: PermissionLevel): ClassDecorator & MethodDecorator =>
  appendAccessRequirement({ kind: 'access', module, level });
