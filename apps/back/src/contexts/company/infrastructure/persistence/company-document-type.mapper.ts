import { CompanyDocumentType } from '../../domain/company-document-type';
import { CompanyDocumentTypeOrmEntity } from './company-document-type.orm-entity';

export class CompanyDocumentTypeMapper {
  static toDomain(orm: CompanyDocumentTypeOrmEntity): CompanyDocumentType {
    return {
      id: orm.id,
      code: orm.code,
      name: orm.name,
      isSystem: orm.isSystem,
    };
  }
}
