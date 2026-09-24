export type ExtractionWarningCode =
  | 'missing_issuer_tax_id'
  | 'missing_invoice_number'
  | 'missing_invoice_date'
  | 'missing_total_amount'
  | 'missing_issuer_name'
  | 'amounts_inconsistent'
  | 'multiple_tax_rates';
