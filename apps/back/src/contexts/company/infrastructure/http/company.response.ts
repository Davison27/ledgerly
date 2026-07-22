import { Company } from '../../domain/company';

interface CompanyResponseProps {
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
  brandColor: string | null;
}

export class CompanyResponse {
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
  brandColor: string | null;

  private constructor(props: CompanyResponseProps) {
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
    this.brandColor = props.brandColor;
  }

  static fromDomain(company: Company): CompanyResponse {
    const primitives = company.toPrimitives();
    return new CompanyResponse({
      id: primitives.id,
      name: primitives.name,
      legalName: primitives.legalName,
      taxId: primitives.taxId,
      sector: primitives.sector,
      email: primitives.email,
      phone: primitives.phone,
      website: primitives.website,
      address: primitives.address,
      city: primitives.city,
      postalCode: primitives.postalCode,
      country: primitives.country,
      logo: primitives.logo,
      brandColor: primitives.brandColor,
    });
  }
}
