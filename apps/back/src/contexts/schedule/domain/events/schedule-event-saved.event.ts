import { DomainEvent } from '../../../../shared/domain/domain-event';

export interface ScheduleEventSavedEventProps {
  eventId: string;
  dates: string[];
}

export class ScheduleEventSavedEvent implements DomainEvent {
  static readonly EVENT_NAME = 'schedule.eventSaved';

  readonly name = ScheduleEventSavedEvent.EVENT_NAME;
  readonly eventId: string;
  readonly dates: string[];

  constructor(props: ScheduleEventSavedEventProps) {
    this.eventId = props.eventId;
    this.dates = [...props.dates];
  }
}
