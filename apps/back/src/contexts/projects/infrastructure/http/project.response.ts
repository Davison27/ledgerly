import { Project } from '../../domain/project';

export class ProjectResponse {
  id: string;
  name: string;
  code: string;

  static fromDomain(project: Project): ProjectResponse {
    const response = new ProjectResponse();
    const primitives = project.toPrimitives();

    response.id = primitives.id;
    response.name = primitives.name;
    response.code = primitives.code;

    return response;
  }
}
