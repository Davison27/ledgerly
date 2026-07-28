import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../../domain/session';
import { SessionRepository, SessionWithMember } from '../../domain/session.repository';
import { WorkspaceMember, WorkspaceMemberStatus } from '../../domain/workspace-member';
import { SessionMapper } from './session.mapper';
import { SessionOrmEntity } from './session.orm-entity';
import { WorkspaceMemberOrmEntity } from './workspace-member.orm-entity';

interface ActiveSessionRow {
  sessionId: string;
  sessionMemberId: string;
  sessionTokenHash: string;
  sessionCsrfHash: string;
  sessionCreatedAt: Date;
  sessionLastSeenAt: Date;
  sessionExpiresAt: Date;
  sessionRevokedAt: Date | null;
  memberId: string;
  memberEmail: string;
  memberGoogleSubject: string | null;
  memberName: string;
  memberPermissions: Record<string, unknown>;
  memberStatus: string;
  memberIsFounder: boolean;
  memberInvitedAt: Date;
  memberJoinedAt: Date | null;
  memberLastActiveAt: Date | null;
}

function toSessionWithMember(row: ActiveSessionRow): SessionWithMember {
  const session = Session.fromPrimitives({
    id: row.sessionId,
    memberId: row.sessionMemberId,
    tokenHash: row.sessionTokenHash,
    csrfHash: row.sessionCsrfHash,
    createdAt: row.sessionCreatedAt,
    lastSeenAt: row.sessionLastSeenAt,
    expiresAt: row.sessionExpiresAt,
    revokedAt: row.sessionRevokedAt,
  });

  const member = WorkspaceMember.fromPrimitives({
    id: row.memberId,
    email: row.memberEmail,
    googleSubject: row.memberGoogleSubject,
    name: row.memberName,
    permissions: row.memberPermissions,
    status: row.memberStatus as WorkspaceMemberStatus,
    isFounder: row.memberIsFounder,
    invitedAt: row.memberInvitedAt,
    joinedAt: row.memberJoinedAt,
    lastActiveAt: row.memberLastActiveAt,
  });

  return { session, member };
}

@Injectable()
export class TypeOrmSessionRepository implements SessionRepository {
  constructor(
    @InjectRepository(SessionOrmEntity)
    private readonly repository: Repository<SessionOrmEntity>,
  ) {}

  async findActiveByTokenHash(tokenHash: string, now: Date): Promise<SessionWithMember | null> {
    const row = await this.repository
      .createQueryBuilder('session')
      .innerJoin(WorkspaceMemberOrmEntity, 'member', 'member.id = session.member_id')
      .select('session.id', 'sessionId')
      .addSelect('session.member_id', 'sessionMemberId')
      .addSelect('session.token_hash', 'sessionTokenHash')
      .addSelect('session.csrf_hash', 'sessionCsrfHash')
      .addSelect('session.created_at', 'sessionCreatedAt')
      .addSelect('session.last_seen_at', 'sessionLastSeenAt')
      .addSelect('session.expires_at', 'sessionExpiresAt')
      .addSelect('session.revoked_at', 'sessionRevokedAt')
      .addSelect('member.id', 'memberId')
      .addSelect('member.email', 'memberEmail')
      .addSelect('member.google_subject', 'memberGoogleSubject')
      .addSelect('member.name', 'memberName')
      .addSelect('member.permissions', 'memberPermissions')
      .addSelect('member.status', 'memberStatus')
      .addSelect('member.is_founder', 'memberIsFounder')
      .addSelect('member.invited_at', 'memberInvitedAt')
      .addSelect('member.joined_at', 'memberJoinedAt')
      .addSelect('member.last_active_at', 'memberLastActiveAt')
      .where('session.token_hash = :tokenHash', { tokenHash })
      .andWhere('session.revoked_at IS NULL')
      .andWhere('session.expires_at > :now', { now })
      .getRawOne<ActiveSessionRow>();

    return row ? toSessionWithMember(row) : null;
  }

  async save(session: Session): Promise<void> {
    await this.repository.save(SessionMapper.toOrm(session));
  }

  async revokeById(id: string, at: Date): Promise<void> {
    await this.repository.update({ id }, { revokedAt: at });
  }

  async revokeAllForMember(memberId: string, at: Date): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(SessionOrmEntity)
      .set({ revokedAt: at })
      .where('member_id = :memberId', { memberId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }

  async deleteExpired(now: Date): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where('revoked_at IS NOT NULL')
      .orWhere('expires_at <= :now', { now })
      .execute();

    return result.affected ?? 0;
  }
}
