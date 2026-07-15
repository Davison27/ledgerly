import { Email } from './value-objects/email';

interface CompanyProps {
  id: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  sector: string | null;
  email: Email | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  logo: string | null;
}

export class Company {
  private id: string;
  private name: string;
  private legalName: string | null;
  private taxId: string | null;
  private sector: string | null;
  private email: Email | null;
  private phone: string | null;
  private website: string | null;
  private address: string | null;
  private city: string | null;
  private postalCode: string | null;
  private country: string | null;
  private logo: string | null;

  private constructor(props: CompanyProps) {
    this.id = props.id;
    this.name = props.name;
    this.legalName = props.legalName;
    this.taxId = props.taxId;
    this.sector = props.sector;
    this.email = props.email;
    this.phone = props.phone;
    this.website = props.website;
    this.address = props.address;
    this.city = props.city;
    this.postalCode = props.postalCode;
    this.country = props.country;
    this.logo = props.logo;
  }

  static create(props: {
    id: string;
    name: string;
    legalName?: string | null;
    taxId?: string | null;
    sector?: string | null;
    email?: Email | null;
    phone?: string | null;
    website?: string | null;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
    logo?: string | null;
  }): Company {
    return new Company({
      id: props.id,
      name: props.name,
      legalName: props.legalName ?? null,
      taxId: props.taxId ?? null,
      sector: props.sector ?? null,
      email: props.email ?? null,
      phone: props.phone ?? null,
      website: props.website ?? null,
      address: props.address ?? null,
      city: props.city ?? null,
      postalCode: props.postalCode ?? null,
      country: props.country ?? null,
      logo: props.logo ?? null,
    });
  }

  static fromPrimitives(props: {
    id: string;
    name: string;
    legalName: string | null;
    taxId: string | null;
    sector: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
    logo: string | null;
  }): Company {
    return new Company({
      id: props.id,
      name: props.name,
      legalName: props.legalName,
      taxId: props.taxId,
      sector: props.sector,
      email: props.email !== null ? Email.create(props.email) : null,
      phone: props.phone,
      website: props.website,
      address: props.address,
      city: props.city,
      postalCode: props.postalCode,
      country: props.country,
      logo: props.logo,
    });
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getLegalName(): string | null {
    return this.legalName;
  }

  getTaxId(): string | null {
    return this.taxId;
  }

  getSector(): string | null {
    return this.sector;
  }

  getEmail(): string | null {
    return this.email !== null ? this.email.toValue() : null;
  }

  getPhone(): string | null {
    return this.phone;
  }

  getWebsite(): string | null {
    return this.website;
  }

  getAddress(): string | null {
    return this.address;
  }

  getCity(): string | null {
    return this.city;
  }

  getPostalCode(): string | null {
    return this.postalCode;
  }

  getCountry(): string | null {
    return this.country;
  }

  getLogo(): string | null {
    return this.logo;
  }

  rename(name: string): void {
    this.name = name;
  }

  changeLegalName(legalName: string | null): void {
    this.legalName = legalName;
  }

  changeTaxId(taxId: string | null): void {
    this.taxId = taxId;
  }

  changeSector(sector: string | null): void {
    this.sector = sector;
  }

  changeEmail(email: string | null): void {
    this.email = email !== null ? Email.create(email) : null;
  }

  changePhone(phone: string | null): void {
    this.phone = phone;
  }

  changeWebsite(website: string | null): void {
    this.website = website;
  }

  changeAddress(address: string | null): void {
    this.address = address;
  }

  changeCity(city: string | null): void {
    this.city = city;
  }

  changePostalCode(postalCode: string | null): void {
    this.postalCode = postalCode;
  }

  changeCountry(country: string | null): void {
    this.country = country;
  }

  changeLogo(logo: string | null): void {
    this.logo = logo;
  }

  toPrimitives(): {
    id: string;
    name: string;
    legalName: string | null;
    taxId: string | null;
    sector: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
    logo: string | null;
  } {
    return {
      id: this.id,
      name: this.name,
      legalName: this.legalName,
      taxId: this.taxId,
      sector: this.sector,
      email: this.getEmail(),
      phone: this.phone,
      website: this.website,
      address: this.address,
      city: this.city,
      postalCode: this.postalCode,
      country: this.country,
      logo: this.logo,
    };
  }
}
