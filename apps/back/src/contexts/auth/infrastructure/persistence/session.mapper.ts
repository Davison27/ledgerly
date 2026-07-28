import { Session } from '../../domain/session';
import { SessionOrmEntity } from './session.orm-entity';

export class SessionMapper {
  static toDomain(orm: SessionOrmEntity): Session {
    return Session.fromPrimitives({
      id: orm.id,
      memberId: orm.memberId,
      tokenHash: orm.tokenHash,
      csrfHash: orm.csrfHash,
      createdAt: orm.createdAt,
      lastSeenAt: orm.lastSeenAt,
      expiresAt: orm.expiresAt,
      revokedAt: orm.revokedAt,
    });
  }

  static toOrm(session: Session): SessionOrmEntity {
    const orm = new SessionOrmEntity();
    const primitives = session.toPrimitives();

    orm.id = primitives.id;
    orm.memberId = primitives.memberId;
    orm.tokenHash = primitives.tokenHash;
    orm.csrfHash = primitives.csrfHash;
    orm.createdAt = primitives.createdAt;
    orm.lastSeenAt = primitives.lastSeenAt;
    orm.expiresAt = primitives.expiresAt;
    orm.revokedAt = primitives.revokedAt;

    return orm;
  }
}
