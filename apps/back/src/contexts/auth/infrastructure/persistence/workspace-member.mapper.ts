import { WorkspaceMember, WorkspaceMemberStatus } from '../../domain/workspace-member';
import { WorkspaceMemberOrmEntity } from './workspace-member.orm-entity';

export class WorkspaceMemberMapper {
  static toDomain(orm: WorkspaceMemberOrmEntity): WorkspaceMember {
    return WorkspaceMember.fromPrimitives({
      id: orm.id,
      email: orm.email,
      googleSubject: orm.googleSubject,
      name: orm.name,
      permissions: orm.permissions,
      status: orm.status as WorkspaceMemberStatus,
      isFounder: orm.isFounder,
      invitedAt: orm.invitedAt,
      joinedAt: orm.joinedAt,
      lastActiveAt: orm.lastActiveAt,
    });
  }

  static toOrm(member: WorkspaceMember): WorkspaceMemberOrmEntity {
    const orm = new WorkspaceMemberOrmEntity();
    const primitives = member.toPrimitives();

    orm.id = primitives.id;
    orm.email = primitives.email;
    orm.googleSubject = primitives.googleSubject;
    orm.name = primitives.name;
    orm.role = primitives.role;
    orm.permissions = primitives.permissions as Record<string, string>;
    orm.status = primitives.status;
    orm.isFounder = primitives.isFounder;
    orm.invitedAt = primitives.invitedAt;
    orm.joinedAt = primitives.joinedAt;
    orm.lastActiveAt = primitives.lastActiveAt;

    return orm;
  }
}
