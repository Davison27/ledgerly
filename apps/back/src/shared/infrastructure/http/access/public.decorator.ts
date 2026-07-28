import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'auth:isPublic';

export const Public = (): ClassDecorator & MethodDecorator => SetMetadata(IS_PUBLIC_KEY, true);
