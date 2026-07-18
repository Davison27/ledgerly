import { XMLParser } from 'fast-xml-parser';
import { DOCUMENT_CURRENCIES, DocumentCurrency } from '../document-currency';
import { InvoiceFields } from './invoice-fields';
import { normaliseDate } from './invoice-date';
import { parseXmlDecimal } from './spanish-number';
import { xmlGet, xmlText } from './xml-node';

const parser = new XMLParser({
  removeNSPrefix: true,
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

function isDocumentCurrency(value: string | undefined): value is DocumentCurrency {
  return value != null && (DOCUMENT_CURRENCIES as string[]).includes(value);
}

function readIssuerName(supplierParty: unknown): string | undefined {
  return xmlText(supplierParty, 'PartyName', 'Name') ?? xmlText(supplierParty, 'PartyLegalEntity', 'RegistrationName');
}

/**
 * Parses a UBL 2.1 Invoice (root `<Invoice>`, as used by Peppol BIS Billing
 * 3.0) into best-effort invoice fields. Returns `null` when the document is
 * not a recognisable UBL invoice, so the caller can fall back to another
 * extraction strategy.
 */
export function parseUbl(xml: string): InvoiceFields | null {
  let parsed: unknown;
  try {
    parsed = parser.parse(xml) as unknown;
  } catch {
    return null;
  }

  const root = xmlGet(parsed, 'Invoice');
  if (root == null) {
    return null;
  }

  const supplierParty = xmlGet(root, 'AccountingSupplierParty', 'Party');
  const invoiceNumber = xmlText(root, 'ID');
  if (invoiceNumber == null && supplierParty == null) {
    return null;
  }

  const issuerName = readIssuerName(supplierParty);
  const issuerTaxId = xmlText(supplierParty, 'PartyTaxScheme', 'CompanyID');

  const date = normaliseDate(xmlText(root, 'IssueDate')) ?? undefined;
  const dueDate = normaliseDate(xmlText(root, 'DueDate')) ?? undefined;

  const currencyCode = xmlText(root, 'DocumentCurrencyCode');
  const currency: DocumentCurrency | undefined = isDocumentCurrency(currencyCode) ? currencyCode : undefined;

  const monetaryTotal = xmlGet(root, 'LegalMonetaryTotal');
  const amount = parseXmlDecimal(xmlText(monetaryTotal, 'TaxInclusiveAmount')) ?? undefined;

  const taxTotal = xmlGet(root, 'TaxTotal');
  const taxAmount = parseXmlDecimal(xmlText(taxTotal, 'TaxAmount')) ?? undefined;
  const taxSubtotal = xmlGet(taxTotal, 'TaxSubtotal');
  const taxBase = parseXmlDecimal(xmlText(taxSubtotal, 'TaxableAmount')) ?? undefined;
  const taxRate = parseXmlDecimal(xmlText(taxSubtotal, 'TaxCategory', 'Percent')) ?? undefined;

  const fields: InvoiceFields = {};
  if (issuerName) fields.issuerName = issuerName;
  if (issuerTaxId) fields.issuerTaxId = issuerTaxId;
  if (invoiceNumber) fields.invoiceNumber = invoiceNumber;
  if (date) fields.date = date;
  if (dueDate) fields.dueDate = dueDate;
  if (currency) fields.currency = currency;
  if (taxBase != null) fields.taxBase = taxBase;
  if (taxRate != null) fields.taxRate = taxRate;
  if (taxAmount != null) fields.taxAmount = taxAmount;
  if (amount != null) fields.amount = amount;

  return fields;
}
