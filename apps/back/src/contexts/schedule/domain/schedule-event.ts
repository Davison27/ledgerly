import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';
import { ScheduleEventDay, ScheduleEventDayPrimitives } from './schedule-event-day';

const MAX_TITLE_LENGTH = 120;

export interface ScheduleEventProductPrimitives {
  productId: string;
  quantity: number;
}

export interface ScheduleEventPrimitives {
  id: string;
  projectId: string;
  title: string | null;
  notes: string | null;
  days: ScheduleEventDayPrimitives[];
  staffMemberIds: string[];
  products: ScheduleEventProductPrimitives[];
}

export interface CreateScheduleEventProps {
  id: string;
  projectId: string;
  title?: string | null;
  notes?: string | null;
  days: ScheduleEventDayPrimitives[];
  staffMemberIds?: string[];
  products?: ScheduleEventProductPrimitives[];
}

export interface ScheduleEventChanges {
  projectId?: string;
  title?: string | null;
  notes?: string | null;
  days?: ScheduleEventDayPrimitives[];
  staffMemberIds?: string[];
  products?: ScheduleEventProductPrimitives[];
}

interface ScheduleEventProps {
  id: string;
  projectId: string;
  title: string | null;
  notes: string | null;
  days: ScheduleEventDay[];
  staffMemberIds: string[];
  products: ScheduleEventProductPrimitives[];
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
  private readonly products_: ScheduleEventProductPrimitives[];

  private constructor(props: ScheduleEventProps) {
    this.id_ = props.id;
    this.projectId_ = props.projectId;
    this.title_ = props.title;
    this.notes_ = props.notes;
    this.days_ = props.days;
    this.staffMemberIds_ = props.staffMemberIds;
    this.products_ = props.products;
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

    const products = params.products ?? [];
    assertNoDuplicates(
      products.map((product) => product.productId),
      'product',
    );

    products.forEach((product) => {
      if (!Number.isInteger(product.quantity) || product.quantity <= 0) {
        throw new InvalidValueException('product quantity must be a positive integer');
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
      products: products.map((product) => ({ ...product })),
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
      products: changes.products ?? this.products_.map((product) => ({ ...product })),
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

  get products(): ScheduleEventProductPrimitives[] {
    return this.products_.map((product) => ({ ...product }));
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
      products: this.products_.map((product) => ({ ...product })),
    };
  }
}
