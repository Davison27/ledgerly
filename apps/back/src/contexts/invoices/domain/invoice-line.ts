import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';

export interface InvoiceLineProps {
  description: string;
  unitPrice: number;
}

export class InvoiceLine {
  private description: string;
  private unitPrice: number;

  private constructor(props: InvoiceLineProps) {
    this.description = props.description;
    this.unitPrice = props.unitPrice;
  }

  static create(props: InvoiceLineProps): InvoiceLine {
    if (props.description.trim().length === 0) {
      throw new InvalidValueException('description must not be empty');
    }

    if (props.description.length > 200) {
      throw new InvalidValueException('description must be at most 200 characters');
    }

    if (props.unitPrice < 0) {
      throw new InvalidValueException('unitPrice must be greater than or equal to 0');
    }

    return new InvoiceLine(props);
  }

  static fromPrimitives(props: InvoiceLineProps): InvoiceLine {
    return new InvoiceLine(props);
  }

  getDescription(): string {
    return this.description;
  }

  getUnitPrice(): number {
    return this.unitPrice;
  }

  toPrimitives(): InvoiceLineProps {
    return {
      description: this.description,
      unitPrice: this.unitPrice,
    };
  }
}
