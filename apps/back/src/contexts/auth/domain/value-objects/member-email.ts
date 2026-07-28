import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';
import { ValueObject } from '../../../../shared/domain/value-object';

export class MemberEmail extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): MemberEmail {
    const normalized = value.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalized)) {
      throw new InvalidValueException(`Invalid email format: ${value}`);
    }

    return new MemberEmail(normalized);
  }
}
