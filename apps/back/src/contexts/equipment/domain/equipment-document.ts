import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface EquipmentDocumentProps {
  id: string;
  equipmentId: string;
  name: string;
  issueDate: string | null;
  expiryDate: string | null;
  notes: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export class EquipmentDocument {
  private constructor(private readonly props: EquipmentDocumentProps) {}

  static create(props: EquipmentDocumentProps): EquipmentDocument {
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

    if (props.notes !== null && props.notes.length > 5000) {
      throw new InvalidValueException('notes must be at most 5000 characters');
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

    return new EquipmentDocument({ ...props });
  }

  static fromPrimitives(props: EquipmentDocumentProps): EquipmentDocument {
    return new EquipmentDocument({ ...props });
  }

  getId(): string {
    return this.props.id;
  }

  getEquipmentId(): string {
    return this.props.equipmentId;
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

  withChanges(
    changes: Partial<Pick<EquipmentDocumentProps, 'name' | 'issueDate' | 'expiryDate' | 'notes'>>,
  ): EquipmentDocument {
    return EquipmentDocument.create({ ...this.props, ...changes });
  }

  toPrimitives(): EquipmentDocumentProps {
    return { ...this.props };
  }
}
