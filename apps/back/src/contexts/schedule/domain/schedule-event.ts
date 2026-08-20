import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';
import { ScheduleEventDay, ScheduleEventDayPrimitives } from './schedule-event-day';

const MAX_TITLE_LENGTH = 120;

export interface ScheduleEventEquipmentPrimitives {
  equipmentId: string;
  quantity: number;
}

export interface ScheduleEventPrimitives {
  id: string;
  projectId: string;
  title: string | null;
  notes: string | null;
  days: ScheduleEventDayPrimitives[];
  staffMemberIds: string[];
  equipment: ScheduleEventEquipmentPrimitives[];
}

export interface CreateScheduleEventProps {
  id: string;
  projectId: string;
  title?: string | null;
  notes?: string | null;
  days: ScheduleEventDayPrimitives[];
  staffMemberIds?: string[];
  equipment?: ScheduleEventEquipmentPrimitives[];
}

export interface ScheduleEventChanges {
  projectId?: string;
  title?: string | null;
  notes?: string | null;
  days?: ScheduleEventDayPrimitives[];
  staffMemberIds?: string[];
  equipment?: ScheduleEventEquipmentPrimitives[];
}

interface ScheduleEventProps {
  id: string;
  projectId: string;
  title: string | null;
  notes: string | null;
  days: ScheduleEventDay[];
  staffMemberIds: string[];
  equipment: ScheduleEventEquipmentPrimitives[];
}

function assertNoDuplicates(values: string[], subject: string): void {
  if (new Set(values).size !== values.length) {
    throw new InvalidValueException(`a schedule event must not repeat the same ${subject}`);
  }
}

export class ScheduleEvent {
  private readonly id_: string;
  private readonly projectId_: string;
  private readonly title_: string | null;
  private readonly notes_: string | null;
  private readonly days_: ScheduleEventDay[];
  private readonly staffMemberIds_: string[];
  private readonly equipment_: ScheduleEventEquipmentPrimitives[];

  private constructor(props: ScheduleEventProps) {
    this.id_ = props.id;
    this.projectId_ = props.projectId;
    this.title_ = props.title;
    this.notes_ = props.notes;
    this.days_ = props.days;
    this.staffMemberIds_ = props.staffMemberIds;
    this.equipment_ = props.equipment;
  }

  static create(params: CreateScheduleEventProps): ScheduleEvent {
    if (params.days.length === 0) {
      throw new InvalidValueException('a schedule event must have at least one day');
    }

    const days = params.days
      .map((day) => ScheduleEventDay.create(day))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    assertNoDuplicates(
      days.map((day) => day.date),
      'date',
    );

    const staffMemberIds = params.staffMemberIds ?? [];
    assertNoDuplicates(staffMemberIds, 'staff member');

    const equipment = params.equipment ?? [];
    assertNoDuplicates(
      equipment.map((equipment) => equipment.equipmentId),
      'equipment',
    );

    equipment.forEach((equipment) => {
      if (!Number.isInteger(equipment.quantity) || equipment.quantity <= 0) {
        throw new InvalidValueException('equipment quantity must be a positive integer');
      }
    });

    const title = params.title ?? null;

    if (title !== null && title.length > MAX_TITLE_LENGTH) {
      throw new InvalidValueException(`title must be at most ${MAX_TITLE_LENGTH} characters`);
    }

    return new ScheduleEvent({
      id: params.id,
      projectId: params.projectId,
      title,
      notes: params.notes ?? null,
      days,
      staffMemberIds: [...staffMemberIds],
      equipment: equipment.map((equipment) => ({ ...equipment })),
    });
  }

  withChanges(changes: ScheduleEventChanges): ScheduleEvent {
    return ScheduleEvent.create({
      id: this.id_,
      projectId: changes.projectId ?? this.projectId_,
      title: changes.title !== undefined ? changes.title : this.title_,
      notes: changes.notes !== undefined ? changes.notes : this.notes_,
      days: changes.days ?? this.days_.map((day) => day.toPrimitives()),
      staffMemberIds: changes.staffMemberIds ?? [...this.staffMemberIds_],
      equipment: changes.equipment ?? this.equipment_.map((equipment) => ({ ...equipment })),
    });
  }

  get id(): string {
    return this.id_;
  }

  get projectId(): string {
    return this.projectId_;
  }

  get title(): string | null {
    return this.title_;
  }

  get notes(): string | null {
    return this.notes_;
  }

  get days(): ScheduleEventDay[] {
    return [...this.days_];
  }

  get staffMemberIds(): string[] {
    return [...this.staffMemberIds_];
  }

  get equipment(): ScheduleEventEquipmentPrimitives[] {
    return this.equipment_.map((equipment) => ({ ...equipment }));
  }

  get startDate(): string {
    return this.days_[0].date;
  }

  get endDate(): string {
    return this.days_[this.days_.length - 1].date;
  }

  toPrimitives(): ScheduleEventPrimitives {
    return {
      id: this.id_,
      projectId: this.projectId_,
      title: this.title_,
      notes: this.notes_,
      days: this.days_.map((day) => day.toPrimitives()),
      staffMemberIds: [...this.staffMemberIds_],
      equipment: this.equipment_.map((equipment) => ({ ...equipment })),
    };
  }
}
