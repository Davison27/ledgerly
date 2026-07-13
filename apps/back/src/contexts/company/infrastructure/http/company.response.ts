import { Company } from '../../domain/company';

export class CompanyResponse {
  id: string;
  name: string;
  sector: string;
  color: string;

  private constructor(props: { id: string; name: string; sector: string; color: string }) {
    this.id = props.id;
    this.name = props.name;
    this.sector = props.sector;
    this.color = props.color;
  }

  static fromDomain(company: Company): CompanyResponse {
    const primitives = company.toPrimitives();
    return new CompanyResponse({
      id: primitives.id,
      name: primitives.name,
      sector: primitives.sector,
      color: primitives.color,
    });
  }
}
