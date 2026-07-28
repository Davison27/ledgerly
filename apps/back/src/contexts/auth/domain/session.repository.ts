import { Session } from './session';
import { WorkspaceMember } from './workspace-member';

export const SESSION_REPOSITORY = Symbol('SessionRepository');

export interface SessionWithMember {
  session: Session;
  member: WorkspaceMember;
}

export interface SessionRepository {
  findActiveByTokenHash(tokenHash: string, now: Date): Promise<SessionWithMember | null>;
  save(session: Session): Promise<void>;
  revokeById(id: string, at: Date): Promise<void>;
  revokeAllForMember(memberId: string, at: Date): Promise<void>;
  deleteExpired(now: Date): Promise<number>;
}
