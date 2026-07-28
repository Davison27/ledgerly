import { Session } from '../../domain/session';
import { SessionOrmEntity } from './session.orm-entity';

export class SessionMapper {
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
