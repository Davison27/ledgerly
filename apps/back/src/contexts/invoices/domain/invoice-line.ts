import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface InvoiceLineProps {
  description: string;
  unitPrice: number;
  quantity: number;
  productId?: string | null;
}

export class InvoiceLine {
  private description: string;
  private unitPrice: number;
  private quantity: number;
  private productId: string | null;

  private constructor(props: InvoiceLineProps) {
    this.description = props.description;
    this.unitPrice = props.unitPrice;
    this.quantity = props.quantity;
    this.productId = props.productId ?? null;
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

    if (props.quantity <= 0) {
      throw new InvalidValueException('quantity must be greater than 0');
    }

    if (Math.round(props.quantity * 1000) !== props.quantity * 1000) {
      throw new InvalidValueException('quantity must have at most 3 decimals');
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

  getQuantity(): number {
    return this.quantity;
  }

  getProductId(): string | null {
    return this.productId;
  }

  getAmount(): number {
    return round2(this.quantity * this.unitPrice);
  }

  toPrimitives(): InvoiceLineProps {
    return {
      description: this.description,
      unitPrice: this.unitPrice,
      quantity: this.quantity,
      productId: this.productId,
    };
  }
}
