import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface StaffDocumentProps {
  id: string;
  staffMemberId: string;
  typeId: string;
  name: string;
  issueDate: string;
  expiryDate?: string | null;
  notes?: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export class StaffDocument {
  private id: string;
  private staffMemberId: string;
  private typeId: string;
  private name: string;
  private issueDate: string;
  private expiryDate: string | null;
  private notes: string | null;
  private fileName: string;
  private mimeType: string;
  private fileSize: number;

  private constructor(props: StaffDocumentProps) {
    this.id = props.id;
    this.staffMemberId = props.staffMemberId;
    this.typeId = props.typeId;
    this.name = props.name;
    this.issueDate = props.issueDate;
    this.expiryDate = props.expiryDate ?? null;
    this.notes = props.notes ?? null;
    this.fileName = props.fileName;
    this.mimeType = props.mimeType;
    this.fileSize = props.fileSize;
  }

  static create(props: StaffDocumentProps): StaffDocument {
    if (!DATE_PATTERN.test(props.issueDate)) {
      throw new InvalidValueException('issueDate must match the format YYYY-MM-DD');
    }

    const expiryDate = props.expiryDate ?? null;

    if (expiryDate !== null && !DATE_PATTERN.test(expiryDate)) {
      throw new InvalidValueException('expiryDate must match the format YYYY-MM-DD');
    }

    if (expiryDate !== null && expiryDate < props.issueDate) {
      throw new InvalidValueException('expiryDate must be on or after issueDate');
    }

    if (props.fileSize < 0) {
      throw new InvalidValueException('fileSize must be greater than or equal to 0');
    }

    return new StaffDocument(props);
  }

  static fromPrimitives(props: StaffDocumentProps): StaffDocument {
    return new StaffDocument(props);
  }

  getId(): string {
    return this.id;
  }

  getStaffMemberId(): string {
    return this.staffMemberId;
  }

  getTypeId(): string {
    return this.typeId;
  }

  getName(): string {
    return this.name;
  }

  getIssueDate(): string {
    return this.issueDate;
  }

  getExpiryDate(): string | null {
    return this.expiryDate;
  }

  getNotes(): string | null {
    return this.notes;
  }

  getFileName(): string {
    return this.fileName;
  }

  getMimeType(): string {
    return this.mimeType;
  }

  getFileSize(): number {
    return this.fileSize;
  }

  /**
   * Applies a partial set of changes by re-running them through `create()`
   * (same reasoning as `document.ts`'s `withChanges()`). `id`, `staffMemberId`,
   * `typeId` and the file fields are deliberately excluded: identity,
   * ownership and the stored file are not editable — only `name`,
   * `issueDate`, `expiryDate` and `notes` are (matches
   * `UpdateStaffDocumentUseCase`).
   */
  withChanges(
    changes: Partial<Omit<StaffDocumentProps, 'id' | 'staffMemberId' | 'typeId' | 'fileName' | 'mimeType' | 'fileSize'>>,
  ): StaffDocument {
    return StaffDocument.create({ ...this.toPrimitives(), ...changes });
  }

  toPrimitives(): Required<StaffDocumentProps> {
    return {
      id: this.id,
      staffMemberId: this.staffMemberId,
      typeId: this.typeId,
      name: this.name,
      issueDate: this.issueDate,
      expiryDate: this.expiryDate,
      notes: this.notes,
      fileName: this.fileName,
      mimeType: this.mimeType,
      fileSize: this.fileSize,
    };
  }
}
