export interface InvoiceNumberProps {
  series: string;
  year: number;
  number: number;
}

export class InvoiceNumber {
  private series: string;
  private year: number;
  private number: number;

  private constructor(props: InvoiceNumberProps) {
    this.series = props.series;
    this.year = props.year;
    this.number = props.number;
  }

  static create(props: InvoiceNumberProps): InvoiceNumber {
    return new InvoiceNumber(props);
  }

  getSeries(): string {
    return this.series;
  }

  getYear(): number {
    return this.year;
  }

  getNumber(): number {
    return this.number;
  }

  toString(): string {
    return `${this.series}-${this.year}-${String(this.number).padStart(4, '0')}`;
  }
}
