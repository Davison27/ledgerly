import { Project } from '../../domain/project';
import { ProjectType } from '../../domain/project-type';
import { ProjectStatus } from '../../domain/project-status';
import { ProjectCurrency } from '../../domain/project-currency';
import { ProjectColor } from '../../domain/project-color';
import { Client } from '../../domain/client';
import { ClientResponse } from './client.response';
import { ProjectSummary } from '../../domain/project-summary';

export class ProjectResponse {
  id: string;
  name: string;
  code: string;
  type: ProjectType;
  status: ProjectStatus;
  description: string | null;
  clientId: string;
  client: ClientResponse | null;
  address: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  currency: ProjectCurrency;
  manager: string | null;
  image: string | null;
  color: ProjectColor | null;
  planningEnabled: boolean;
  checklistAssigned?: boolean;
  checklistCompletedCount?: number;
  checklistTotalCount?: number;

  static fromDomain(
    project: Project,
    client: Client | null = null,
    summary?: ProjectSummary | null,
    includeChecklistAssignment = false,
  ): ProjectResponse {
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
    response.planningEnabled = primitives.planningEnabled ?? false;
    if (includeChecklistAssignment && summary?.checklistAssigned !== undefined) {
      response.checklistAssigned = summary.checklistAssigned;
    }
    if (primitives.planningEnabled && summary?.planningEnabled) {
      response.checklistCompletedCount = summary.checklistCompletedCount ?? 0;
      response.checklistTotalCount = summary.checklistTotalCount ?? 0;
    }

    return response;
  }
}
