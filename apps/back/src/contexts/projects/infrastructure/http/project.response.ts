import { Project } from '../../domain/project';
import { ProjectType } from '../../domain/project-type';
import { ProjectStatus } from '../../domain/project-status';
import { ProjectCurrency } from '../../domain/project-currency';
import { ProjectColor } from '../../domain/project-color';
import { Client } from '../../domain/client';
import { ClientResponse } from './client.response';

export class ProjectResponse {
  id: string;
  name: string;
  code: string;
  type: ProjectType;
  status: ProjectStatus;
  description: string | null;
  clientId: string | null;
  client: ClientResponse | null;
  address: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  currency: ProjectCurrency;
  manager: string | null;
  image: string | null;
  color: ProjectColor | null;

  static fromDomain(project: Project, client: Client | null = null): ProjectResponse {
    const response = new ProjectResponse();
    const primitives = project.toPrimitives();

    response.id = primitives.id;
    response.name = primitives.name;
    response.code = primitives.code;
    response.type = primitives.type;
    response.status = primitives.status;
    response.description = primitives.description;
    response.clientId = primitives.clientId;
    response.client = client === null ? null : ClientResponse.fromDomain(client);
    response.address = primitives.address;
    response.startDate = primitives.startDate;
    response.endDate = primitives.endDate;
    response.budget = primitives.budget;
    response.currency = primitives.currency;
    response.manager = primitives.manager;
    response.image = primitives.image;
    response.color = primitives.color;

    return response;
  }
}
