import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { InvoicePdfRenderer, InvoicePdfView } from '../../domain/invoice-pdf-renderer.port';

const PAGE_MARGIN = 50;
const DATA_URL_IMAGE_PATTERN = /^data:image\/(png|jpe?g);base64,(.+)$/;

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount);
}

function formatQuantity(quantity: number): string {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 3 }).format(quantity);
}

function decodeLogo(logo: string | null): Buffer | null {
  if (logo === null) {
    return null;
  }

  const match = DATA_URL_IMAGE_PATTERN.exec(logo);

  if (!match) {
    return null;
  }

  try {
    return Buffer.from(match[2], 'base64');
  } catch {
    return null;
  }
}

@Injectable()
export class PdfkitInvoicePdfRenderer implements InvoicePdfRenderer {
  render(view: InvoicePdfView): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.renderHeader(doc, view);
      this.renderCustomer(doc, view);
      this.renderLines(doc, view);
      this.renderTotals(doc, view);
      this.renderFooter(doc, view);

      doc.end();
    });
  }

  private renderHeader(doc: PDFKit.PDFDocument, view: InvoicePdfView): void {
    const logo = decodeLogo(view.issuer.logo);
    let issuerTop = PAGE_MARGIN;

    if (logo) {
      try {
        doc.image(logo, PAGE_MARGIN, PAGE_MARGIN, { fit: [120, 60] });
        issuerTop = PAGE_MARGIN + 68;
      } catch {
        issuerTop = PAGE_MARGIN;
      }
    }

    doc.fontSize(11).font('Helvetica-Bold').text(view.issuer.name, PAGE_MARGIN, issuerTop);
    doc.font('Helvetica').fontSize(9);

    if (view.issuer.legalName) {
      doc.text(view.issuer.legalName, PAGE_MARGIN);
    }

    doc.text(`NIF/CIF: ${view.issuer.taxId}`, PAGE_MARGIN);

    if (view.issuer.address) {
      doc.text(view.issuer.address, PAGE_MARGIN);
    }

    const cityLine = [view.issuer.postalCode, view.issuer.city].filter(Boolean).join(' ');
    if (cityLine) {
      doc.text(cityLine, PAGE_MARGIN);
    }

    if (view.issuer.country) {
      doc.text(view.issuer.country, PAGE_MARGIN);
    }

    if (view.issuer.email) {
      doc.text(view.issuer.email, PAGE_MARGIN);
    }

    if (view.issuer.phone) {
      doc.text(view.issuer.phone, PAGE_MARGIN);
    }

    if (view.issuer.website) {
      doc.text(view.issuer.website, PAGE_MARGIN);
    }

    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .text('FACTURA', PAGE_MARGIN, PAGE_MARGIN, { align: 'right' });
    doc
      .font('Helvetica')
      .fontSize(10)
      .text(view.number, { align: 'right' })
      .text(view.issueDate, { align: 'right' });

    doc.moveDown(2);
  }

  private renderCustomer(doc: PDFKit.PDFDocument, view: InvoicePdfView): void {
    doc.y = Math.max(doc.y, PAGE_MARGIN + 150);
    doc.font('Helvetica-Bold').fontSize(10).text('Cliente');
    doc.font('Helvetica').fontSize(9).text(view.customer.name);

    if (view.customer.taxId) {
      doc.text(`NIF/CIF: ${view.customer.taxId}`);
    }

    if (view.customer.address) {
      doc.text(view.customer.address);
    }

    doc.moveDown(1.5);
  }

  private renderLines(doc: PDFKit.PDFDocument, view: InvoicePdfView): void {
    const tableTop = doc.y;
    const descriptionX = PAGE_MARGIN;
    const quantityX = 330;
    const unitPriceX = 390;
    const amountX = 450;

    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Descripción', descriptionX, tableTop, { width: 260 });
    doc.text('Cantidad', quantityX, tableTop, { width: 50, align: 'right' });
    doc.text('Precio', unitPriceX, tableTop, { width: 55, align: 'right' });
    doc.text('Importe', amountX, tableTop, { width: 95, align: 'right' });
    doc
      .moveTo(PAGE_MARGIN, tableTop + 15)
      .lineTo(545, tableTop + 15)
      .stroke();

    doc.font('Helvetica').fontSize(9);
    let y = tableTop + 22;

    for (const line of view.lines) {
      doc.text(line.description, descriptionX, y, { width: 260 });
      doc.text(formatQuantity(line.quantity), quantityX, y, { width: 50, align: 'right' });
      doc.text(formatCurrency(line.unitPrice, view.currency), unitPriceX, y, { width: 55, align: 'right' });
      doc.text(formatCurrency(line.amount, view.currency), amountX, y, { width: 95, align: 'right' });
      y += 18;
    }

    doc.y = y + 10;
  }

  private renderTotals(doc: PDFKit.PDFDocument, view: InvoicePdfView): void {
    const labelX = 350;
    const amountX = 450;
    const rowHeight = 16;

    const row = (label: string, amount: string): void => {
      const y = doc.y;
      doc.text(label, labelX, y, { width: 95 });
      doc.text(amount, amountX, y, { width: 95, align: 'right' });
      doc.y = y + rowHeight;
    };

    doc.font('Helvetica').fontSize(9);
    row('Base imponible', formatCurrency(view.taxBase, view.currency));
    row(`IVA (${view.taxRate}%)`, formatCurrency(view.taxAmount, view.currency));
    row(`IRPF (${view.irpfRate}%)`, `-${formatCurrency(view.irpfAmount, view.currency)}`);

    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(11);
    row('TOTAL', formatCurrency(view.total, view.currency));

    doc.moveDown(2);
  }

  private renderFooter(doc: PDFKit.PDFDocument, view: InvoicePdfView): void {
    if (!view.notes) {
      return;
    }

    doc.font('Helvetica').fontSize(8).text(view.notes, PAGE_MARGIN, doc.y, { width: 495 });
  }
}
