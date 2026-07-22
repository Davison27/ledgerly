import { Company } from '../../domain/company';
import { CompanyOrmEntity } from './company.orm-entity';

export class CompanyMapper {
  static toDomain(orm: CompanyOrmEntity): Company {
    return Company.fromPrimitives({
      id: orm.id,
      name: orm.name,
      legalName: orm.legalName,
      taxId: orm.taxId,
      sector: orm.sector,
      email: orm.email,
      phone: orm.phone,
      website: orm.website,
      address: orm.address,
      city: orm.city,
      postalCode: orm.postalCode,
      country: orm.country,
      logo: orm.logo,
      brandColor: orm.brandColor,
    });
  }

  static toOrm(company: Company): CompanyOrmEntity {
    const orm = new CompanyOrmEntity();
    const primitives = company.toPrimitives();

    orm.id = primitives.id;
    orm.name = primitives.name;
    orm.legalName = primitives.legalName;
    orm.taxId = primitives.taxId;
    orm.sector = primitives.sector;
    orm.email = primitives.email;
    orm.phone = primitives.phone;
    orm.website = primitives.website;
    orm.address = primitives.address;
    orm.city = primitives.city;
    orm.postalCode = primitives.postalCode;
    orm.country = primitives.country;
    orm.logo = primitives.logo;
    orm.brandColor = primitives.brandColor;

    return orm;
  }
}
