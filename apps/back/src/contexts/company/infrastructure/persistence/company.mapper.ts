import { Company } from '../../domain/company';
import { CompanyOrmEntity } from './company.orm-entity';

export class CompanyMapper {
  static toDomain(orm: CompanyOrmEntity): Company {
    return Company.fromPrimitives({
      id: orm.id,
      name: orm.name,
      sector: orm.sector,
      color: orm.color,
    });
  }

  static toOrm(company: Company): CompanyOrmEntity {
    const orm = new CompanyOrmEntity();
    const primitives = company.toPrimitives();

    orm.id = primitives.id;
    orm.name = primitives.name;
    orm.sector = primitives.sector;
    orm.color = primitives.color;

    return orm;
  }
}
