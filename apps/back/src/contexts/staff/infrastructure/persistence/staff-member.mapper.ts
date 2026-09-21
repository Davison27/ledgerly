import { StaffMember } from '../../domain/staff-member';
import { StaffMemberOrmEntity } from './staff-member.orm-entity';

export class StaffMemberMapper {
  toDomain(orm: StaffMemberOrmEntity): StaffMember {
    return StaffMember.create({
      id: orm.id,
      firstName: orm.firstName,
      lastName: orm.lastName,
      taxId: orm.taxId,
      email: orm.email,
      phone: orm.phone,
      position: orm.position,
      hireDate: orm.hireDate,
      endDate: orm.endDate,
      notes: orm.notes,
      archivedAt: orm.archivedAt?.toISOString() ?? null,
    });
  }

  toOrm(staffMember: StaffMember): StaffMemberOrmEntity {
    const orm = new StaffMemberOrmEntity();
    const primitives = staffMember.toPrimitives();

    orm.id = primitives.id;
    orm.firstName = primitives.firstName;
    orm.lastName = primitives.lastName;
    orm.taxId = primitives.taxId;
    orm.email = primitives.email;
    orm.phone = primitives.phone;
    orm.position = primitives.position;
    orm.hireDate = primitives.hireDate;
    orm.endDate = primitives.endDate;
    orm.notes = primitives.notes;
    orm.archivedAt = primitives.archivedAt !== undefined && primitives.archivedAt !== null
      ? new Date(primitives.archivedAt)
      : null;

    return orm;
  }
}
