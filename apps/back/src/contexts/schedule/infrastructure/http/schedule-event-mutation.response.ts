export type ScheduleEventMutationDto = { id: string };

export class ScheduleEventMutationResponse implements ScheduleEventMutationDto {
  constructor(readonly id: string) {}
}
