import { SetMetadata } from '@nestjs/common';
import { AccessRequirement, ACCESS_REQUIREMENT_KEY } from './access-requirement';

export const RequiresAdmin = (): ClassDecorator & MethodDecorator =>
  SetMetadata(ACCESS_REQUIREMENT_KEY, { kind: 'admin' } satisfies AccessRequirement);
