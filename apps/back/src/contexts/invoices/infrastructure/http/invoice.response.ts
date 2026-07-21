import { Invoice } from '../../domain/invoice';

export class InvoiceLineResponse {
  description: string;
  unitPrice: number;
}

export class InvoiceResponse {
  id: string;
  series: string;
  year: number;
  number: number;
  fullNumber: string;
  issueDate: string;
  projectId: string;
  customerName: string;
  customerTaxId: string | null;
  customerAddress: string | null;
  lines: InvoiceLineResponse[];
  taxBase: number;
  taxRate: number;
  taxAmount: number;
  irpfRate: number;
  irpfAmount: number;
  total: number;
  currency: string;
  notes: string | null;
  documentId: string | null;
  hasPdf: boolean;

  static fromDomain(invoice: Invoice): InvoiceResponse {
    const response = new InvoiceResponse();

    response.id = invoice.getId();
    response.series = invoice.getSeries();
    response.year = invoice.getYear();
    response.number = invoice.getNumber();
    response.fullNumber = invoice.getFullNumber();
    response.issueDate = invoice.getIssueDate();
    response.projectId = invoice.getProjectId();
    response.customerName = invoice.getCustomerName();
    response.customerTaxId = invoice.getCustomerTaxId();
    response.customerAddress = invoice.getCustomerAddress();
    response.lines = invoice.getLines().map((line) => ({
      description: line.getDescription(),
      unitPrice: line.getUnitPrice(),
    }));
    response.taxBase = invoice.getTaxBase();
    response.taxRate = invoice.getTaxRate();
    response.taxAmount = invoice.getTaxAmount();
    response.irpfRate = invoice.getIrpfRate();
    response.irpfAmount = invoice.getIrpfAmount();
    response.total = invoice.getTotal();
    response.currency = invoice.getCurrency();
    response.notes = invoice.getNotes();
    response.documentId = invoice.getDocumentId();
    response.hasPdf = invoice.hasPdf();

    return response;
  }
}
