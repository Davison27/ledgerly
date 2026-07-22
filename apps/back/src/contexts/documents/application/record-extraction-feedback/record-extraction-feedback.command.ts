import { InvoiceFields } from '../../domain/extraction/invoice-fields';

export interface RecordExtractionFeedbackCommand {
  fileBuffer: Buffer;
  submitted: InvoiceFields;
}
