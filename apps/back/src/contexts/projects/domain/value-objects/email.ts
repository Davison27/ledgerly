import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';
import { ValueObject } from '../../../../shared/domain/value-object';

export class Email extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Email {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new InvalidValueException(`Invalid email format: ${value}`);
    }
    return new Email(value);
  }
}
