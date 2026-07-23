import { ScheduleEvent } from './schedule-event';
import { ScheduleProjectView } from './schedule-project-reader.port';
import { ScheduleStaffView } from './schedule-staff-reader.port';
import { ScheduleProductView } from './schedule-product-reader.port';

export interface ScheduleEventView {
  event: ScheduleEvent;
  project: ScheduleProjectView;
  staff: ScheduleStaffView[];
  products: Array<ScheduleProductView & { quantity: number }>;
}

export interface ScheduleEventViewSources {
  projects: ScheduleProjectView[];
  staff: ScheduleStaffView[];
  products: ScheduleProductView[];
}

export function buildScheduleEventViews(
  events: ScheduleEvent[],
  sources: ScheduleEventViewSources,
): ScheduleEventView[] {
  const projectsById = new Map(sources.projects.map((project) => [project.id, project]));
  const staffById = new Map(sources.staff.map((member) => [member.id, member]));
  const productsById = new Map(sources.products.map((product) => [product.id, product]));

  return events.map((event) => ({
    event,
    project: projectsById.get(event.projectId) as ScheduleProjectView,
    staff: event.staffMemberIds
      .map((staffMemberId) => staffById.get(staffMemberId))
      .filter((member): member is ScheduleStaffView => member !== undefined),
    products: event.products
      .map((product) => {
        const productView = productsById.get(product.productId);

        return productView !== undefined ? { ...productView, quantity: product.quantity } : null;
      })
      .filter((product): product is ScheduleProductView & { quantity: number } => product !== null),
  }));
}
