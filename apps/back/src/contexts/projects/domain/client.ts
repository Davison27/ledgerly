import { Email } from './value-objects/email';
import { normalizeTaxId } from '../../../shared/domain/tax-id';

export interface ClientPrimitives {
  id: string;
  name: string;
  taxId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  archivedAt?: string | null;
}

interface ClientProps {
  id: string;
  name: string;
  taxId: string | null;
  contactName: string | null;
  contactEmail: Email | null;
  contactPhone: string | null;
  archivedAt: string | null;
}

export class Client {
  private readonly id_: string;
  private name_: string;
  private taxId_: string | null;
  private contactName_: string | null;
  private contactEmail_: Email | null;
  private contactPhone_: string | null;
  private archivedAt_: string | null;

  private constructor(props: ClientProps) {
    this.id_ = props.id;
    this.name_ = props.name;
    this.taxId_ = props.taxId;
    this.contactName_ = props.contactName;
    this.contactEmail_ = props.contactEmail;
    this.contactPhone_ = props.contactPhone;
    this.archivedAt_ = props.archivedAt;
  }

  static create(params: ClientPrimitives): Client {
    return new Client({
      id: params.id,
      name: params.name,
      taxId: normalizeTaxId(params.taxId),
      contactName: params.contactName,
      contactEmail: params.contactEmail !== null ? Email.create(params.contactEmail) : null,
      contactPhone: params.contactPhone,
      archivedAt: params.archivedAt ?? null,
    });
  }

  rename(name: string): void {
    this.name_ = name;
  }

  changeTaxId(taxId: string | null): void {
    this.taxId_ = normalizeTaxId(taxId);
  }

  changeContactName(contactName: string | null): void {
    this.contactName_ = contactName;
  }

  changeContactEmail(contactEmail: string | null): void {
    this.contactEmail_ = contactEmail !== null ? Email.create(contactEmail) : null;
  }

  changeContactPhone(contactPhone: string | null): void {
    this.contactPhone_ = contactPhone;
  }

  archive(timestamp: string): void {
    this.archivedAt_ = timestamp;
  }

  unarchive(): void {
    this.archivedAt_ = null;
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

  get contactName(): string | null {
    return this.contactName_;
  }

  get contactEmail(): string | null {
    return this.contactEmail_ !== null ? this.contactEmail_.toValue() : null;
  }

  get contactPhone(): string | null {
    return this.contactPhone_;
  }

  get archivedAt(): string | null {
    return this.archivedAt_;
  }

  toPrimitives(): ClientPrimitives {
    const primitives: ClientPrimitives = {
      id: this.id_,
      name: this.name_,
      taxId: this.taxId_,
      contactName: this.contactName_,
      contactEmail: this.contactEmail,
      contactPhone: this.contactPhone_,
    };

    return this.archivedAt_ === null ? primitives : { ...primitives, archivedAt: this.archivedAt_ };
  }
}
