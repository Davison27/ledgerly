import { Project } from '../../domain/project';
import { ProjectType } from '../../domain/project-type';
import { ProjectStatus } from '../../domain/project-status';
import { ProjectCurrency } from '../../domain/project-currency';
import { ProjectOrmEntity } from './project.orm-entity';

export class ProjectMapper {
  toDomain(orm: ProjectOrmEntity): Project {
    return Project.create({
      id: orm.id,
      name: orm.name,
      code: orm.code,
      type: orm.type as ProjectType,
      status: orm.status as ProjectStatus,
      description: orm.description,
      clientCompany: orm.clientCompany,
      clientTaxId: orm.clientTaxId,
      contactName: orm.contactName,
      contactEmail: orm.contactEmail,
      contactPhone: orm.contactPhone,
      address: orm.address,
      startDate: orm.startDate,
      endDate: orm.endDate,
      budget: orm.budget !== null ? Number(orm.budget) : null,
      currency: orm.currency as ProjectCurrency,
      fiscalYear: orm.fiscalYear,
      manager: orm.manager,
      image: orm.image,
    });
  }

  toOrm(project: Project): ProjectOrmEntity {
    const orm = new ProjectOrmEntity();
    const primitives = project.toPrimitives();

    orm.id = primitives.id;
    orm.name = primitives.name;
    orm.code = primitives.code;
    orm.type = primitives.type;
    orm.status = primitives.status;
    orm.description = primitives.description;
    orm.clientCompany = primitives.clientCompany;
    orm.clientTaxId = primitives.clientTaxId;
    orm.contactName = primitives.contactName;
    orm.contactEmail = primitives.contactEmail;
    orm.contactPhone = primitives.contactPhone;
    orm.address = primitives.address;
    orm.startDate = primitives.startDate;
    orm.endDate = primitives.endDate;
    orm.budget = primitives.budget !== null ? primitives.budget.toString() : null;
    orm.currency = primitives.currency;
    orm.fiscalYear = primitives.fiscalYear;
    orm.manager = primitives.manager;
    orm.image = primitives.image;

    return orm;
  }
}
