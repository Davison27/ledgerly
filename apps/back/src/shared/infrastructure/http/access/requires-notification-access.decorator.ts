import { appendAccessRequirement } from './access-requirement';

export const RequiresNotificationAccess = (): ClassDecorator & MethodDecorator =>
  appendAccessRequirement({ kind: 'notifications' });
