import { StaffDocumentType } from '../../domain/staff-document-type';
import { StaffDocumentTypeOrmEntity } from './staff-document-type.orm-entity';

export class StaffDocumentTypeMapper {
  static toDomain(orm: StaffDocumentTypeOrmEntity): StaffDocumentType {
    return {
      id: orm.id,
      code: orm.code,
      name: orm.name,
      expires: orm.expires,
      defaultValidityMonths: orm.defaultValidityMonths,
      isSystem: orm.isSystem,
    };
  }
}
