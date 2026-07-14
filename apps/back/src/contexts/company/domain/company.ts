import { HexColor } from './value-objects/hex-color';

interface CompanyProps {
  id: string;
  name: string;
  sector: string;
  color: HexColor;
}

export class Company {
  private id: string;
  private name: string;
  private sector: string;
  private color: HexColor;

  private constructor(props: CompanyProps) {
    this.id = props.id;
    this.name = props.name;
    this.sector = props.sector;
    this.color = props.color;
  }

  static create(props: { id: string; name: string; sector: string; color: HexColor }): Company {
    return new Company(props);
  }

  static fromPrimitives(props: {
    id: string;
    name: string;
    sector: string;
    color: string;
  }): Company {
    return new Company({
      id: props.id,
      name: props.name,
      sector: props.sector,
      color: HexColor.create(props.color),
    });
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getSector(): string {
    return this.sector;
  }

  getColor(): HexColor {
    return this.color;
  }

  rename(name: string): void {
    this.name = name;
  }

  changeSector(sector: string): void {
    this.sector = sector;
  }

  changeColor(hex: string): void {
    this.color = HexColor.create(hex);
  }

  toPrimitives(): { id: string; name: string; sector: string; color: string } {
    return {
      id: this.id,
      name: this.name,
      sector: this.sector,
      color: this.color.toValue(),
    };
  }
}
