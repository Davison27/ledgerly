import { InvoiceFields } from '../../domain/extraction/invoice-fields';

export interface RecordExtractionOutcomeCommand {
  fileBuffer: Buffer;
  submitted: InvoiceFields;
}
