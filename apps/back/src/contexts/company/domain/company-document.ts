import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface CompanyDocumentProps {
  id: string;
  typeId: string;
  name: string;
  issueDate: string | null;
  expiryDate: string | null;
  notes: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export class CompanyDocument {
  private constructor(private readonly props: CompanyDocumentProps) {}

  static create(props: CompanyDocumentProps): CompanyDocument {
    if (props.name.trim().length === 0 || props.name.length > 200) {
      throw new InvalidValueException('name must contain between 1 and 200 characters');
    }

    if (props.issueDate !== null && !DATE_PATTERN.test(props.issueDate)) {
      throw new InvalidValueException('issueDate must match the format YYYY-MM-DD');
    }

    if (props.expiryDate !== null && !DATE_PATTERN.test(props.expiryDate)) {
      throw new InvalidValueException('expiryDate must match the format YYYY-MM-DD');
    }

    if (props.issueDate !== null && props.expiryDate !== null && props.expiryDate < props.issueDate) {
      throw new InvalidValueException('expiryDate must be on or after issueDate');
    }

    if (props.fileName.trim().length === 0 || props.fileName.length > 255) {
      throw new InvalidValueException('fileName must contain between 1 and 255 characters');
    }

    if (props.mimeType !== 'application/pdf') {
      throw new InvalidValueException('mimeType must be application/pdf');
    }

    if (!Number.isSafeInteger(props.fileSize) || props.fileSize < 0) {
      throw new InvalidValueException('fileSize must be a non-negative safe integer');
    }

    return new CompanyDocument({ ...props });
  }

  static fromPrimitives(props: CompanyDocumentProps): CompanyDocument {
    return new CompanyDocument({ ...props });
  }

  getId(): string {
    return this.props.id;
  }

  getTypeId(): string {
    return this.props.typeId;
  }

  getName(): string {
    return this.props.name;
  }

  getIssueDate(): string | null {
    return this.props.issueDate;
  }

  getExpiryDate(): string | null {
    return this.props.expiryDate;
  }

  getNotes(): string | null {
    return this.props.notes;
  }

  getFileName(): string {
    return this.props.fileName;
  }

  getMimeType(): string {
    return this.props.mimeType;
  }

  getFileSize(): number {
    return this.props.fileSize;
  }

  withChanges(changes: Partial<Pick<CompanyDocumentProps, 'name' | 'issueDate' | 'expiryDate' | 'notes'>>): CompanyDocument {
    return CompanyDocument.create({ ...this.props, ...changes });
  }

  toPrimitives(): CompanyDocumentProps {
    return { ...this.props };
  }
}
