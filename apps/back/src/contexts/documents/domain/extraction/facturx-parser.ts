import { XMLParser } from 'fast-xml-parser';
import { DOCUMENT_CURRENCIES, DocumentCurrency } from '../document-currency';
import { InvoiceFields } from './invoice-fields';
import { normaliseAnyDate } from './invoice-date';
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

const SPANISH_VAT_ID = /^ES([0-9A-Z]{8,9})$/i;

function normaliseTaxId(raw: string | undefined): string | undefined {
  if (!raw) {
    return undefined;
  }

  const match = SPANISH_VAT_ID.exec(raw.trim());
  return match ? match[1].toUpperCase() : raw.trim();
}

/**
 * Parses a Factur-X/ZUGFeRD Cross Industry Invoice (CII) XML document
 * (`rsm:CrossIndustryInvoice`) into best-effort invoice fields. Returns
 * `null` when the document is not a recognisable CII invoice, so the caller
 * can fall back to another extraction strategy.
 */
export function parseFacturx(xml: string): InvoiceFields | null {
  let parsed: unknown;
  try {
    parsed = parser.parse(xml) as unknown;
  } catch {
    return null;
  }

  const root = xmlGet(parsed, 'CrossIndustryInvoice');
  if (root == null) {
    return null;
  }

  const exchangedDocument = xmlGet(root, 'ExchangedDocument');
  const transaction = xmlGet(root, 'SupplyChainTradeTransaction');
  if (exchangedDocument == null && transaction == null) {
    return null;
  }

  const agreement = xmlGet(transaction, 'ApplicableHeaderTradeAgreement');
  const seller = xmlGet(agreement, 'SellerTradeParty');
  const settlement = xmlGet(transaction, 'ApplicableHeaderTradeSettlement');
  const summation = xmlGet(settlement, 'SpecifiedTradeSettlementHeaderMonetarySummation');

  const invoiceNumber = xmlText(exchangedDocument, 'ID');
  const date = normaliseAnyDate(xmlText(exchangedDocument, 'IssueDateTime', 'DateTimeString')) ?? undefined;
  const dueDate =
    normaliseAnyDate(
      xmlText(settlement, 'SpecifiedTradePaymentTerms', 'DueDateDateTime', 'DateTimeString'),
    ) ?? undefined;

  const issuerName = xmlText(seller, 'Name');
  const issuerTaxId =
    normaliseTaxId(xmlText(seller, 'SpecifiedTaxRegistration', 'ID')) ??
    normaliseTaxId(xmlText(seller, 'SpecifiedLegalOrganization', 'ID'));

  const currencyCode = xmlText(settlement, 'InvoiceCurrencyCode');
  const currency: DocumentCurrency | undefined = isDocumentCurrency(currencyCode) ? currencyCode : undefined;

  const taxBase = parseXmlDecimal(xmlText(summation, 'TaxBasisTotalAmount')) ?? undefined;
  const taxAmount = parseXmlDecimal(xmlText(summation, 'TaxTotalAmount')) ?? undefined;
  const amount = parseXmlDecimal(xmlText(summation, 'GrandTotalAmount')) ?? undefined;

  const explicitTaxRate = parseXmlDecimal(
    xmlText(settlement, 'ApplicableTradeTax', 'RateApplicablePercent'),
  );
  const taxRate =
    explicitTaxRate ??
    (taxBase != null && taxBase > 0 && taxAmount != null
      ? Math.round((taxAmount / taxBase) * 100 * 100) / 100
      : undefined) ??
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
  if (amount != null) fields.amount = amount;

  return fields;
}
