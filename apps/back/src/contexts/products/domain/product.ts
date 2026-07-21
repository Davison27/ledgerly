import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';

export interface ProductPrimitives {
  id: string;
  name: string;
  price: number | null;
}

interface ProductProps {
  id: string;
  name: string;
  price: number | null;
}

export class Product {
  private readonly id_: string;
  private name_: string;
  private price_: number | null;

  private constructor(props: ProductProps) {
    this.id_ = props.id;
    this.name_ = props.name;
    this.price_ = props.price;
  }

  static create(params: ProductPrimitives): Product {
    Product.validateName(params.name);
    Product.validatePrice(params.price);

    return new Product({
      id: params.id,
      name: params.name,
      price: params.price,
    });
  }

  private static validateName(name: string): void {
    if (name.trim().length === 0) {
      throw new InvalidValueException('Product name must not be empty');
    }

    if (name.length > 200) {
      throw new InvalidValueException('Product name must be at most 200 characters');
    }
  }

  private static validatePrice(price: number | null): void {
    if (price !== null && price < 0) {
      throw new InvalidValueException('Product price must not be negative');
    }
  }

  rename(name: string): void {
    Product.validateName(name);
    this.name_ = name;
  }

  changePrice(price: number | null): void {
    Product.validatePrice(price);
    this.price_ = price;
  }

  get id(): string {
    return this.id_;
  }

  get name(): string {
    return this.name_;
  }

  get price(): number | null {
    return this.price_;
  }

  toPrimitives(): ProductPrimitives {
    return {
      id: this.id_,
      name: this.name_,
      price: this.price_,
    };
  }
}
