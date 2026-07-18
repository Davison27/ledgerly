import { Project } from '../../domain/project';
import { ProjectType } from '../../domain/project-type';
import { ProjectStatus } from '../../domain/project-status';
import { ProjectCurrency } from '../../domain/project-currency';

export class ProjectResponse {
  id: string;
  name: string;
  code: string;
  type: ProjectType;
  status: ProjectStatus;
  description: string | null;
  clientCompany: string | null;
  clientTaxId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  currency: ProjectCurrency;
  fiscalYear: string | null;
  manager: string | null;
  image: string | null;
  isDemo: boolean;

  static fromDomain(project: Project): ProjectResponse {
    const response = new ProjectResponse();
    const primitives = project.toPrimitives();

    response.id = primitives.id;
    response.name = primitives.name;
    response.code = primitives.code;
    response.type = primitives.type;
    response.status = primitives.status;
    response.description = primitives.description;
    response.clientCompany = primitives.clientCompany;
    response.clientTaxId = primitives.clientTaxId;
    response.contactName = primitives.contactName;
    response.contactEmail = primitives.contactEmail;
    response.contactPhone = primitives.contactPhone;
    response.address = primitives.address;
    response.startDate = primitives.startDate;
    response.endDate = primitives.endDate;
    response.budget = primitives.budget;
    response.currency = primitives.currency;
    response.fiscalYear = primitives.fiscalYear;
    response.manager = primitives.manager;
    response.image = primitives.image;
    response.isDemo = primitives.isDemo ?? false;

    return response;
  }
}
