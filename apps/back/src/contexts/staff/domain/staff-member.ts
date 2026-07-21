import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NAME_LENGTH = 100;

export interface StaffMemberPrimitives {
  id: string;
  firstName: string;
  lastName: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  position: string | null;
  hireDate: string | null;
  endDate: string | null;
  notes: string | null;
}

export class StaffMember {
  private readonly id_: string;
  private firstName_: string;
  private lastName_: string;
  private taxId_: string | null;
  private email_: string | null;
  private phone_: string | null;
  private position_: string | null;
  private hireDate_: string | null;
  private endDate_: string | null;
  private notes_: string | null;

  private constructor(props: StaffMemberPrimitives) {
    this.id_ = props.id;
    this.firstName_ = props.firstName;
    this.lastName_ = props.lastName;
    this.taxId_ = props.taxId;
    this.email_ = props.email;
    this.phone_ = props.phone;
    this.position_ = props.position;
    this.hireDate_ = props.hireDate;
    this.endDate_ = props.endDate;
    this.notes_ = props.notes;
  }

  static create(params: StaffMemberPrimitives): StaffMember {
    StaffMember.validateName(params.firstName, 'firstName');
    StaffMember.validateName(params.lastName, 'lastName');
    StaffMember.validateDate(params.hireDate, 'hireDate');
    StaffMember.validateDate(params.endDate, 'endDate');
    StaffMember.validateDateOrder(params.hireDate, params.endDate);

    return new StaffMember({ ...params });
  }

  private static validateName(value: string, field: string): void {
    if (value.trim().length === 0) {
      throw new InvalidValueException(`${field} must not be empty`);
    }

    if (value.length > MAX_NAME_LENGTH) {
      throw new InvalidValueException(`${field} must be at most ${MAX_NAME_LENGTH} characters`);
    }
  }

  private static validateDate(value: string | null, field: string): void {
    if (value !== null && !DATE_PATTERN.test(value)) {
      throw new InvalidValueException(`${field} must match the format YYYY-MM-DD`);
    }
  }

  private static validateDateOrder(hireDate: string | null, endDate: string | null): void {
    if (hireDate !== null && endDate !== null && endDate < hireDate) {
      throw new InvalidValueException('endDate must be on or after hireDate');
    }
  }

  /**
   * Applies a partial set of changes by merging them onto the current
   * primitives and re-running every invariant `create()` enforces in one
   * shot, instead of per-field mutators that would validate `hireDate` and
   * `endDate` against a stale counterpart when both change in the same
   * request (see `document.ts`'s `withChanges()` for the same reasoning).
   */
  update(changes: Partial<Omit<StaffMemberPrimitives, 'id'>>): void {
    const merged: StaffMemberPrimitives = { ...this.toPrimitives(), ...changes };

    StaffMember.validateName(merged.firstName, 'firstName');
    StaffMember.validateName(merged.lastName, 'lastName');
    StaffMember.validateDate(merged.hireDate, 'hireDate');
    StaffMember.validateDate(merged.endDate, 'endDate');
    StaffMember.validateDateOrder(merged.hireDate, merged.endDate);

    this.firstName_ = merged.firstName;
    this.lastName_ = merged.lastName;
    this.taxId_ = merged.taxId;
    this.email_ = merged.email;
    this.phone_ = merged.phone;
    this.position_ = merged.position;
    this.hireDate_ = merged.hireDate;
    this.endDate_ = merged.endDate;
    this.notes_ = merged.notes;
  }

  get id(): string {
    return this.id_;
  }

  get firstName(): string {
    return this.firstName_;
  }

  get lastName(): string {
    return this.lastName_;
  }

  get taxId(): string | null {
    return this.taxId_;
  }

  get email(): string | null {
    return this.email_;
  }

  get phone(): string | null {
    return this.phone_;
  }

  get position(): string | null {
    return this.position_;
  }

  get hireDate(): string | null {
    return this.hireDate_;
  }

  get endDate(): string | null {
    return this.endDate_;
  }

  get notes(): string | null {
    return this.notes_;
  }

  toPrimitives(): StaffMemberPrimitives {
    return {
      id: this.id_,
      firstName: this.firstName_,
      lastName: this.lastName_,
      taxId: this.taxId_,
      email: this.email_,
      phone: this.phone_,
      position: this.position_,
      hireDate: this.hireDate_,
      endDate: this.endDate_,
      notes: this.notes_,
    };
  }
}
