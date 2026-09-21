import { Client } from '../../domain/client';
import { ClientOrmEntity } from './client.orm-entity';

export class ClientMapper {
  toDomain(orm: ClientOrmEntity): Client {
    return Client.create({
      id: orm.id,
      name: orm.name,
      taxId: orm.taxId,
      contactName: orm.contactName,
      contactEmail: orm.contactEmail,
      contactPhone: orm.contactPhone,
      archivedAt: orm.archivedAt?.toISOString() ?? null,
    });
  }

  toOrm(client: Client): ClientOrmEntity {
    const orm = new ClientOrmEntity();
    const primitives = client.toPrimitives();

    orm.id = primitives.id;
    orm.name = primitives.name;
    orm.taxId = primitives.taxId;
    orm.contactName = primitives.contactName;
    orm.contactEmail = primitives.contactEmail;
    orm.contactPhone = primitives.contactPhone;
    orm.archivedAt = primitives.archivedAt !== undefined && primitives.archivedAt !== null
      ? new Date(primitives.archivedAt)
      : null;

    return orm;
  }
}
