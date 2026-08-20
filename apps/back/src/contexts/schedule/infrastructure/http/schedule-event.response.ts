import { ScheduleEventView } from '../../domain/schedule-event-view';

export class ScheduleEventProjectResponse {
  id: string;
  name: string;
  code: string;
  image: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  color: string | null;
}

export class ScheduleEventDayResponse {
  date: string;
  startTime: string | null;
  endTime: string | null;
}

export class ScheduleEventStaffResponse {
  id: string;
  firstName: string;
  lastName: string;
}

export class ScheduleEventEquipmentResponse {
  equipmentId: string;
  name: string;
  quantity: number;
  stock: number;
}

export class ScheduleEventResponse {
  id: string;
  projectId: string;
  title: string | null;
  notes: string | null;
  startDate: string;
  endDate: string;
  project: ScheduleEventProjectResponse;
  days: ScheduleEventDayResponse[];
  staff: ScheduleEventStaffResponse[];
  equipment: ScheduleEventEquipmentResponse[];

  static fromView(view: ScheduleEventView): ScheduleEventResponse {
    const response = new ScheduleEventResponse();

    response.id = view.event.id;
    response.projectId = view.event.projectId;
    response.title = view.event.title;
    response.notes = view.event.notes;
    response.startDate = view.event.startDate;
    response.endDate = view.event.endDate;
    response.project = {
      id: view.project.id,
      name: view.project.name,
      code: view.project.code,
      image: view.project.image,
      status: view.project.status,
      startDate: view.project.startDate,
      endDate: view.project.endDate,
      color: view.project.color,
    };
    response.days = view.event.days.map((day) => ({
      date: day.date,
      startTime: day.startTime,
      endTime: day.endTime,
    }));
    response.staff = view.staff.map((member) => ({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
    }));
    response.equipment = view.equipment.map((equipment) => ({
      equipmentId: equipment.id,
      name: equipment.name,
      quantity: equipment.quantity,
      stock: equipment.stock,
    }));

    return response;
  }
}
