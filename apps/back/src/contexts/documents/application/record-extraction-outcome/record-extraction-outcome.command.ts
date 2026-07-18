import { InvoiceFields } from '../../domain/extraction/invoice-fields';

export interface RecordExtractionOutcomeCommand {
  fileBuffer: Buffer;
  /** The fields the user actually submitted when creating the document. */
  submitted: InvoiceFields;
}
