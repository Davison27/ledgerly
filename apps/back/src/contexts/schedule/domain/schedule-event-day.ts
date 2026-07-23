import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

export interface ScheduleEventDayPrimitives {
  date: string;
  startTime: string | null;
  endTime: string | null;
}

export class ScheduleEventDay {
  private readonly date_: string;
  private readonly startTime_: string | null;
  private readonly endTime_: string | null;

  private constructor(props: ScheduleEventDayPrimitives) {
    this.date_ = props.date;
    this.startTime_ = props.startTime;
    this.endTime_ = props.endTime;
  }

  static create(props: ScheduleEventDayPrimitives): ScheduleEventDay {
    if (!DATE_PATTERN.test(props.date)) {
      throw new InvalidValueException('date must match the format YYYY-MM-DD');
    }

    if ((props.startTime === null) !== (props.endTime === null)) {
      throw new InvalidValueException('startTime and endTime must both be present or both be absent');
    }

    if (props.startTime !== null && !TIME_PATTERN.test(props.startTime)) {
      throw new InvalidValueException('startTime must match the format HH:mm');
    }

    if (props.endTime !== null && !TIME_PATTERN.test(props.endTime)) {
      throw new InvalidValueException('endTime must match the format HH:mm');
    }

    if (props.startTime !== null && props.endTime !== null && props.endTime <= props.startTime) {
      throw new InvalidValueException('endTime must be after startTime');
    }

    return new ScheduleEventDay(props);
  }

  get date(): string {
    return this.date_;
  }

  get startTime(): string | null {
    return this.startTime_;
  }

  get endTime(): string | null {
    return this.endTime_;
  }

  isFullDay(): boolean {
    return this.startTime_ === null;
  }

  overlapsWith(other: ScheduleEventDay): boolean {
    if (this.date_ !== other.date_) {
      return false;
    }

    if (this.isFullDay() || other.isFullDay()) {
      return true;
    }

    const startA = this.startTime_;
    const endA = this.endTime_;
    const startB = other.startTime_;
    const endB = other.endTime_;

    return startA !== null && endA !== null && startB !== null && endB !== null && startA < endB && startB < endA;
  }

  toPrimitives(): ScheduleEventDayPrimitives {
    return {
      date: this.date_,
      startTime: this.startTime_,
      endTime: this.endTime_,
    };
  }
}
