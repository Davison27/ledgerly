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

function readIssuerName(seller: unknown): string | undefined {
  const corporateName = xmlText(seller, 'LegalEntity', 'CorporateName');
  if (corporateName) {
    return corporateName;
  }

  const individualName = xmlText(seller, 'Individual', 'Name');
  const firstSurname = xmlText(seller, 'Individual', 'FirstSurname');
  if (individualName) {
    return [individualName, firstSurname].filter(Boolean).join(' ');
  }

  return undefined;
}

export function parseFacturae(xml: string): InvoiceFields | null {
  let parsed: unknown;
  try {
    parsed = parser.parse(xml) as unknown;
  } catch {
    return null;
  }

  const root = xmlGet(parsed, 'Facturae');
  if (root == null) {
    return null;
  }

  const seller = xmlGet(root, 'Parties', 'SellerParty');
  const invoice = xmlGet(root, 'Invoices', 'Invoice');
  if (invoice == null) {
    return null;
  }

  const issuerName = readIssuerName(seller);
  const issuerTaxId = xmlText(seller, 'TaxIdentification', 'TaxIdentificationNumber');
  const invoiceNumber = xmlText(invoice, 'InvoiceHeader', 'InvoiceNumber');

  const date =
    normaliseDate(xmlText(invoice, 'InvoiceIssueData', 'IssueDate')) ??
    normaliseDate(xmlText(invoice, 'IssueData', 'IssueDate')) ??
    undefined;
  const dueDate =
    normaliseDate(xmlText(invoice, 'InvoiceIssueData', 'InvoiceDueDate')) ??
    normaliseDate(xmlText(invoice, 'IssueData', 'InvoiceDueDate')) ??
    undefined;

  const currencyCode =
    xmlText(invoice, 'InvoiceIssueData', 'InvoiceCurrencyCode') ??
    xmlText(invoice, 'IssueData', 'InvoiceCurrencyCode');
  const currency: DocumentCurrency | undefined = isDocumentCurrency(currencyCode) ? currencyCode : 'EUR';

  const firstTax = xmlGet(invoice, 'TaxesOutputs', 'Tax');

  const taxBase =
    parseXmlDecimal(xmlText(invoice, 'InvoiceTotals', 'TotalGrossAmount')) ??
    parseXmlDecimal(xmlText(firstTax, 'TaxableBase', 'TotalAmount')) ??
    undefined;
  const taxRate = parseXmlDecimal(xmlText(firstTax, 'TaxRate')) ?? undefined;
  const taxAmount =
    parseXmlDecimal(xmlText(invoice, 'InvoiceTotals', 'TotalTaxOutputs')) ??
    parseXmlDecimal(xmlText(firstTax, 'TaxAmount', 'TotalAmount')) ??
    undefined;
  const amount = parseXmlDecimal(xmlText(invoice, 'InvoiceTotals', 'InvoiceTotal')) ?? undefined;

  const irpfTax = xmlGet(invoice, 'TaxesWithheld', 'Tax');
  const irpfRate = parseXmlDecimal(xmlText(irpfTax, 'TaxRate')) ?? undefined;
  const irpfAmount =
    parseXmlDecimal(xmlText(invoice, 'InvoiceTotals', 'TotalTaxesWithheld')) ??
    parseXmlDecimal(xmlText(irpfTax, 'TaxAmount', 'TotalAmount')) ??
    undefined;

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
  if (irpfRate != null && irpfRate > 0) fields.irpfRate = irpfRate;
  if (irpfAmount != null && irpfAmount > 0) fields.irpfAmount = irpfAmount;
  if (amount != null) fields.amount = amount;

  return fields;
}
