import { ScheduleProjectView } from '../../domain/schedule-project-reader.port';

export class SchedulableProjectResponse {
  id: string;
  name: string;
  code: string;
  image: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;

  static fromView(project: ScheduleProjectView): SchedulableProjectResponse {
    const response = new SchedulableProjectResponse();

    response.id = project.id;
    response.name = project.name;
    response.code = project.code;
    response.image = project.image;
    response.status = project.status;
    response.startDate = project.startDate;
    response.endDate = project.endDate;

    return response;
  }
}
