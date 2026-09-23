import {
  ScheduleEquipmentEditorOption,
} from '../../domain/schedule-equipment-reader.port';
import { ScheduleProjectEditorOption } from '../../domain/schedule-project-reader.port';
import { ScheduleStaffEditorOption } from '../../domain/schedule-staff-reader.port';

export type ScheduleEditorSelectorOption =
  | ScheduleProjectEditorOption
  | ScheduleStaffEditorOption
  | ScheduleEquipmentEditorOption;

export class ScheduleEditorSelectorResponse {
  id: string;
  displayName: string;

  static fromOption(option: ScheduleEditorSelectorOption): ScheduleEditorSelectorResponse {
    const response = new ScheduleEditorSelectorResponse();
    response.id = option.id;
    response.displayName = option.displayName;
    return response;
  }
}
