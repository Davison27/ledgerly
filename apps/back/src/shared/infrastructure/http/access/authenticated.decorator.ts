import { appendAccessRequirement } from './access-requirement';

export const Authenticated = (): ClassDecorator & MethodDecorator =>
  appendAccessRequirement({ kind: 'authenticated' });
