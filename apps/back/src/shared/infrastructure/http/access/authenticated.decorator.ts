import { SetMetadata } from '@nestjs/common';
import { AccessRequirement, ACCESS_REQUIREMENT_KEY } from './access-requirement';

export const Authenticated = (): ClassDecorator & MethodDecorator =>
  SetMetadata(ACCESS_REQUIREMENT_KEY, { kind: 'authenticated' } satisfies AccessRequirement);
