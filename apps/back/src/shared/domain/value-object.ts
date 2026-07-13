export abstract class ValueObject<T> {
  protected readonly value: T;

  protected constructor(value: T) {
    this.value = value;
  }

  toValue(): T {
    return this.value;
  }

  equals(other: ValueObject<T>): boolean {
    return other instanceof ValueObject && other.value === this.value;
  }
}
