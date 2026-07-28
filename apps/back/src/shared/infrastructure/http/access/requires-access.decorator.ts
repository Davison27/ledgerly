import { SetMetadata } from '@nestjs/common';
import { PermissionLevel, WorkspaceModule } from '../../../../contexts/auth/domain/value-objects/permission-matrix';
import { AccessRequirement, ACCESS_REQUIREMENT_KEY } from './access-requirement';

export const RequiresAccess = (module: WorkspaceModule, level: PermissionLevel): ClassDecorator & MethodDecorator =>
  SetMetadata(ACCESS_REQUIREMENT_KEY, { kind: 'access', module, level } satisfies AccessRequirement);
