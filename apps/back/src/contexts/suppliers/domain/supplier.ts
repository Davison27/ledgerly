import { Email } from './value-objects/email';

export interface SupplierPrimitives {
  id: string;
  name: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  iban: string | null;
  notes: string | null;
}

interface SupplierProps {
  id: string;
  name: string;
  taxId: string | null;
  email: Email | null;
  phone: string | null;
  address: string | null;
  iban: string | null;
  notes: string | null;
}

export class Supplier {
  private readonly id_: string;
  private name_: string;
  private taxId_: string | null;
  private email_: Email | null;
  private phone_: string | null;
  private address_: string | null;
  private iban_: string | null;
  private notes_: string | null;

  private constructor(props: SupplierProps) {
    this.id_ = props.id;
    this.name_ = props.name;
    this.taxId_ = props.taxId;
    this.email_ = props.email;
    this.phone_ = props.phone;
    this.address_ = props.address;
    this.iban_ = props.iban;
    this.notes_ = props.notes;
  }

  static create(params: SupplierPrimitives): Supplier {
    const email = params.email !== null ? Email.create(params.email) : null;

    return new Supplier({
      id: params.id,
      name: params.name,
      taxId: params.taxId,
      email,
      phone: params.phone,
      address: params.address,
      iban: params.iban,
      notes: params.notes,
    });
  }

  rename(name: string): void {
    this.name_ = name;
  }

  changeTaxId(taxId: string | null): void {
    this.taxId_ = taxId;
  }

  changeEmail(email: string | null): void {
    this.email_ = email !== null ? Email.create(email) : null;
  }

  changePhone(phone: string | null): void {
    this.phone_ = phone;
  }

  changeAddress(address: string | null): void {
    this.address_ = address;
  }

  changeIban(iban: string | null): void {
    this.iban_ = iban;
  }

  changeNotes(notes: string | null): void {
    this.notes_ = notes;
  }

  get id(): string {
    return this.id_;
  }

  get name(): string {
    return this.name_;
  }

  get taxId(): string | null {
    return this.taxId_;
  }

  get email(): string | null {
    return this.email_ !== null ? this.email_.toValue() : null;
  }

  get phone(): string | null {
    return this.phone_;
  }

  get address(): string | null {
    return this.address_;
  }

  get iban(): string | null {
    return this.iban_;
  }

  get notes(): string | null {
    return this.notes_;
  }

  toPrimitives(): SupplierPrimitives {
    return {
      id: this.id_,
      name: this.name_,
      taxId: this.taxId_,
      email: this.email,
      phone: this.phone_,
      address: this.address_,
      iban: this.iban_,
      notes: this.notes_,
    };
  }
}
