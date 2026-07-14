import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';
import { ValueObject } from '../../../../shared/domain/value-object';

export class HexColor extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): HexColor {
    const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
    if (!hexColorRegex.test(value)) {
      throw new InvalidValueException(`Invalid hex color format: ${value}`);
    }
    return new HexColor(value);
  }
}
