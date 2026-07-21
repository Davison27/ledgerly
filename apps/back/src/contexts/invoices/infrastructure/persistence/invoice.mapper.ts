import { Invoice } from '../../domain/invoice';
import { InvoiceLine } from '../../domain/invoice-line';
import { InvoiceOrmEntity } from './invoice.orm-entity';
import { InvoiceLineOrmEntity } from './invoice-line.orm-entity';

export class InvoiceMapper {
  static toDomain(orm: InvoiceOrmEntity, lineOrms: InvoiceLineOrmEntity[]): Invoice {
    const lines = [...lineOrms]
      .sort((a, b) => a.position - b.position)
      .map((line) =>
        InvoiceLine.fromPrimitives({
          description: line.description,
          unitPrice: Number(line.unitPrice),
        }),
      );

    return Invoice.fromPrimitives({
      id: orm.id,
      series: orm.series,
      year: orm.year,
      number: orm.number,
      issueDate: orm.issueDate,
      projectId: orm.projectId,
      customerName: orm.customerName,
      customerTaxId: orm.customerTaxId,
      customerAddress: orm.customerAddress,
      lines,
      taxBase: Number(orm.taxBase),
      taxRate: Number(orm.taxRate),
      taxAmount: Number(orm.taxAmount),
      irpfRate: Number(orm.irpfRate),
      irpfAmount: Number(orm.irpfAmount),
      total: Number(orm.total),
      currency: orm.currency,
      notes: orm.notes,
      documentId: orm.documentId,
      pdfSize: orm.pdfSize,
    });
  }

  static toOrm(invoice: Invoice): InvoiceOrmEntity {
    const primitives = invoice.toPrimitives();
    const orm = new InvoiceOrmEntity();

    orm.id = primitives.id;
    orm.series = primitives.series;
    orm.year = primitives.year;
    orm.number = primitives.number;
    orm.issueDate = primitives.issueDate;
    orm.projectId = primitives.projectId;
    orm.customerName = primitives.customerName;
    orm.customerTaxId = primitives.customerTaxId;
    orm.customerAddress = primitives.customerAddress;
    orm.taxBase = primitives.taxBase.toString();
    orm.taxRate = primitives.taxRate.toString();
    orm.taxAmount = primitives.taxAmount.toString();
    orm.irpfRate = primitives.irpfRate.toString();
    orm.irpfAmount = primitives.irpfAmount.toString();
    orm.total = primitives.total.toString();
    orm.currency = primitives.currency;
    orm.notes = primitives.notes;
    orm.documentId = primitives.documentId;
    orm.pdfSize = primitives.pdfSize;

    return orm;
  }

  static linesToOrm(invoice: Invoice, lineIds: string[]): InvoiceLineOrmEntity[] {
    return invoice.getLines().map((line, index) => {
      const orm = new InvoiceLineOrmEntity();

      orm.id = lineIds[index];
      orm.invoiceId = invoice.getId();
      orm.position = index;
      orm.description = line.getDescription();
      orm.unitPrice = line.getUnitPrice().toString();

      return orm;
    });
  }
}
