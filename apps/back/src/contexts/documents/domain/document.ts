import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';
import { DocumentType } from './document-type';
import { DocumentStatus } from './document-status';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface DocumentProps {
  id: string;
  projectId: string;
  name: string;
  type: DocumentType;
  month: number;
  date: string;
  amount: number;
  status: DocumentStatus;
}

export class Document {
  private id: string;
  private projectId: string;
  private name: string;
  private type: DocumentType;
  private month: number;
  private date: string;
  private amount: number;
  private status: DocumentStatus;

  private constructor(props: DocumentProps) {
    this.id = props.id;
    this.projectId = props.projectId;
    this.name = props.name;
    this.type = props.type;
    this.month = props.month;
    this.date = props.date;
    this.amount = props.amount;
    this.status = props.status;
  }

  static create(props: DocumentProps): Document {
    if (!Number.isInteger(props.month) || props.month < 1 || props.month > 12) {
      throw new InvalidValueException('month must be an integer between 1 and 12');
    }

    if (props.amount < 0) {
      throw new InvalidValueException('amount must be greater than or equal to 0');
    }

    if (!DATE_PATTERN.test(props.date)) {
      throw new InvalidValueException('date must match the format YYYY-MM-DD');
    }

    return new Document(props);
  }

  static fromPrimitives(props: DocumentProps): Document {
    return new Document(props);
  }

  getId(): string {
    return this.id;
  }

  getProjectId(): string {
    return this.projectId;
  }

  getName(): string {
    return this.name;
  }

  getType(): DocumentType {
    return this.type;
  }

  getMonth(): number {
    return this.month;
  }

  getDate(): string {
    return this.date;
  }

  getAmount(): number {
    return this.amount;
  }

  getStatus(): DocumentStatus {
    return this.status;
  }

  toPrimitives(): DocumentProps {
    return {
      id: this.id,
      projectId: this.projectId,
      name: this.name,
      type: this.type,
      month: this.month,
      date: this.date,
      amount: this.amount,
      status: this.status,
    };
  }
}
