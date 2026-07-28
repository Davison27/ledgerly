import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { WorkspaceMember } from '../../../../contexts/auth/domain/workspace-member';

interface RequestWithMember extends Request {
  member?: WorkspaceMember;
}

export const CurrentMember = createParamDecorator((_: unknown, context: ExecutionContext): WorkspaceMember => {
  const request = context.switchToHttp().getRequest<RequestWithMember>();

  if (!request.member) {
    throw new Error('CurrentMember decorator used outside of an authenticated route');
  }

  return request.member;
});
