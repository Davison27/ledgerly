import { appendAccessRequirement } from './access-requirement';

export const RequiresAdmin = (): ClassDecorator & MethodDecorator =>
  appendAccessRequirement({ kind: 'admin' });
