import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';

export interface ProductPrimitives {
  id: string;
  name: string;
  price: number | null;
  stock: number;
  reference?: string | null;
  category?: string | null;
  brand?: string | null;
  description?: string | null;
  image?: string | null;
  tags?: string[];
  leasingMonthlyFee?: number | null;
}

interface ProductProps {
  id: string;
  name: string;
  price: number | null;
  stock: number;
  reference: string | null;
  category: string | null;
  brand: string | null;
  description: string | null;
  image: string | null;
  tags: string[];
  leasingMonthlyFee: number | null;
}

export class Product {
  private readonly id_: string;
  private name_: string;
  private price_: number | null;
  private stock_: number;
  private reference_: string | null;
  private category_: string | null;
  private brand_: string | null;
  private description_: string | null;
  private image_: string | null;
  private tags_: string[];
  private leasingMonthlyFee_: number | null;

  private constructor(props: ProductProps) {
    this.id_ = props.id;
    this.name_ = props.name;
    this.price_ = props.price;
    this.stock_ = props.stock;
    this.reference_ = props.reference;
    this.category_ = props.category;
    this.brand_ = props.brand;
    this.description_ = props.description;
    this.image_ = props.image;
    this.tags_ = props.tags;
    this.leasingMonthlyFee_ = props.leasingMonthlyFee;
  }

  static create(params: ProductPrimitives): Product {
    Product.validateName(params.name);
    Product.validatePrice(params.price);
    Product.validateStock(params.stock);
    const reference = Product.normaliseOptionalText(params.reference, 100, 'Product reference');
    const category = Product.normaliseOptionalText(params.category, 100, 'Product category');
    const brand = Product.normaliseOptionalText(params.brand, 100, 'Product brand');
    const description = Product.normaliseOptionalText(params.description, 2000, 'Product description');
    const image = Product.normaliseImage(params.image);
    const tags = Product.normaliseTags(params.tags);
    Product.validateLeasingMonthlyFee(params.leasingMonthlyFee ?? null);

    return new Product({
      id: params.id,
      name: params.name,
      price: params.price,
      stock: params.stock,
      reference,
      category,
      brand,
      description,
      image,
      tags,
      leasingMonthlyFee: params.leasingMonthlyFee ?? null,
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

  private static validateStock(stock: number): void {
    if (!Number.isInteger(stock) || stock < 0) {
      throw new InvalidValueException('Product stock must be a non-negative integer');
    }
  }

  private static validateLeasingMonthlyFee(fee: number | null): void {
    if (fee !== null && fee < 0) {
      throw new InvalidValueException('Product leasing monthly fee must not be negative');
    }
  }

  private static normaliseOptionalText(value: string | null | undefined, maxLength: number, field: string): string | null {
    if (value === null || value === undefined || value.trim().length === 0) {
      return null;
    }

    const normalised = value.trim();
    if (normalised.length > maxLength) {
      throw new InvalidValueException(`${field} must be at most ${maxLength} characters`);
    }

    return normalised;
  }

  private static normaliseImage(image: string | null | undefined): string | null {
    if (image === null || image === undefined || image.length === 0) {
      return null;
    }

    if (!/^data:image\/(png|jpeg|webp);base64,/.test(image)) {
      throw new InvalidValueException('Product image must be a PNG, JPEG, or WEBP data URL');
    }

    if (image.length > 2_800_000) {
      throw new InvalidValueException('Product image must be at most 2 MB');
    }

    return image;
  }

  private static normaliseTags(tags: string[] | undefined): string[] {
    const normalised = Array.from(new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean)));

    if (normalised.length > 8 || normalised.some((tag) => tag.length > 40)) {
      throw new InvalidValueException('Product tags must contain at most 8 values of 40 characters');
    }

    return normalised;
  }

  rename(name: string): void {
    Product.validateName(name);
    this.name_ = name;
  }

  changePrice(price: number | null): void {
    Product.validatePrice(price);
    this.price_ = price;
  }

  changeStock(stock: number): void {
    Product.validateStock(stock);
    this.stock_ = stock;
  }

  changeLeasingMonthlyFee(fee: number | null): void {
    Product.validateLeasingMonthlyFee(fee);
    this.leasingMonthlyFee_ = fee;
  }

  changeDetails(details: Pick<ProductPrimitives, 'reference' | 'category' | 'brand' | 'description' | 'image' | 'tags'>): void {
    this.reference_ = Product.normaliseOptionalText(details.reference, 100, 'Product reference');
    this.category_ = Product.normaliseOptionalText(details.category, 100, 'Product category');
    this.brand_ = Product.normaliseOptionalText(details.brand, 100, 'Product brand');
    this.description_ = Product.normaliseOptionalText(details.description, 2000, 'Product description');
    this.image_ = Product.normaliseImage(details.image);
    this.tags_ = Product.normaliseTags(details.tags);
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

  get stock(): number {
    return this.stock_;
  }

  get reference(): string | null {
    return this.reference_;
  }

  get category(): string | null {
    return this.category_;
  }

  get brand(): string | null {
    return this.brand_;
  }

  get description(): string | null {
    return this.description_;
  }

  get image(): string | null {
    return this.image_;
  }

  get tags(): string[] {
    return [...this.tags_];
  }

  get leasingMonthlyFee(): number | null {
    return this.leasingMonthlyFee_;
  }

  toPrimitives(): ProductPrimitives {
    return {
      id: this.id_,
      name: this.name_,
      price: this.price_,
      stock: this.stock_,
      reference: this.reference_,
      category: this.category_,
      brand: this.brand_,
      description: this.description_,
      image: this.image_,
      tags: this.tags,
      leasingMonthlyFee: this.leasingMonthlyFee_,
    };
  }
}
