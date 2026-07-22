import { Invoice } from './invoice';
import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';

const BASE_PROPS = {
  id: 'invoice-1',
  series: 'F',
  year: 2026,
  number: 0,
  issueDate: '2026-06-01',
  projectId: 'project-1',
  customerName: 'Acme SL',
  lines: [
    { description: 'Consultoría', unitPrice: 100, quantity: 1 },
    { description: 'Desarrollo', unitPrice: 200, quantity: 1 },
    { description: 'Soporte', unitPrice: 50, quantity: 1 },
  ],
};

describe('Invoice', () => {
  it('computes taxBase as the sum of the line prices', () => {
    const invoice = Invoice.create(BASE_PROPS);

    expect(invoice.getTaxBase()).toBe(350);
  });

  it('applies the default tax rate (21%) and irpf rate (0%) when omitted', () => {
    const invoice = Invoice.create(BASE_PROPS);

    expect(invoice.getTaxRate()).toBe(21);
    expect(invoice.getIrpfRate()).toBe(0);
    expect(invoice.getTaxAmount()).toBe(73.5);
    expect(invoice.getIrpfAmount()).toBe(0);
    expect(invoice.getTotal()).toBe(423.5);
  });

  it('subtracts the irpf amount from the total (D3)', () => {
    const invoice = Invoice.create({ ...BASE_PROPS, taxRate: 21, irpfRate: 15 });

    expect(invoice.getTaxAmount()).toBe(73.5);
    expect(invoice.getIrpfAmount()).toBe(52.5);
    expect(invoice.getTotal()).toBe(371);
  });

  it('rounds every computed amount to 2 decimals', () => {
    const invoice = Invoice.create({
      ...BASE_PROPS,
      lines: [{ description: 'Servicio', unitPrice: 33.33, quantity: 1 }],
      taxRate: 21,
      irpfRate: 15,
    });

    expect(invoice.getTaxBase()).toBe(33.33);
    expect(invoice.getTaxAmount()).toBe(7);
    expect(invoice.getIrpfAmount()).toBe(5);
    expect(invoice.getTotal()).toBe(35.33);
  });

  it('multiplies unitPrice by quantity when a line has more than one unit', () => {
    const invoice = Invoice.create({
      ...BASE_PROPS,
      lines: [{ description: 'Servicio', unitPrice: 100, quantity: 3 }],
    });

    expect(invoice.getTaxBase()).toBe(300);
  });

  it('accepts a decimal quantity (D2: hours, kilos...)', () => {
    const invoice = Invoice.create({
      ...BASE_PROPS,
      lines: [{ description: 'Horas', unitPrice: 20, quantity: 1.5 }],
    });

    expect(invoice.getTaxBase()).toBe(30);
  });

  it('rejects a line with quantity 0', () => {
    expect(() =>
      Invoice.create({
        ...BASE_PROPS,
        lines: [{ description: 'Servicio', unitPrice: 10, quantity: 0 }],
      }),
    ).toThrow(InvalidValueException);
  });

  it('rejects a line with a negative quantity', () => {
    expect(() =>
      Invoice.create({
        ...BASE_PROPS,
        lines: [{ description: 'Servicio', unitPrice: 10, quantity: -1 }],
      }),
    ).toThrow(InvalidValueException);
  });

  it('canonical example mirrored in apps/front/src/features/invoices/totals.ts', () => {
    const invoice = Invoice.create({
      ...BASE_PROPS,
      lines: [
        { description: 'Consultoría', unitPrice: 100, quantity: 2 },
        { description: 'Soporte', unitPrice: 33.33, quantity: 1.5 },
      ],
      taxRate: 21,
      irpfRate: 15,
    });

    expect(invoice.getTaxBase()).toBe(250);
    expect(invoice.getTaxAmount()).toBe(52.5);
    expect(invoice.getIrpfAmount()).toBe(37.5);
    expect(invoice.getTotal()).toBe(265);
  });

  it('rejects an invoice without lines', () => {
    expect(() => Invoice.create({ ...BASE_PROPS, lines: [] })).toThrow(InvalidValueException);
  });

  it('rejects an empty customerName', () => {
    expect(() => Invoice.create({ ...BASE_PROPS, customerName: '   ' })).toThrow(InvalidValueException);
  });

  it('rejects an issueDate that does not match YYYY-MM-DD', () => {
    expect(() => Invoice.create({ ...BASE_PROPS, issueDate: '01-06-2026' })).toThrow(InvalidValueException);
  });

  it('rejects a negative taxRate', () => {
    expect(() => Invoice.create({ ...BASE_PROPS, taxRate: -1 })).toThrow(InvalidValueException);
  });

  it('rejects a negative irpfRate', () => {
    expect(() => Invoice.create({ ...BASE_PROPS, irpfRate: -1 })).toThrow(InvalidValueException);
  });

  it('rejects a line with an empty description', () => {
    expect(() =>
      Invoice.create({ ...BASE_PROPS, lines: [{ description: '  ', unitPrice: 10, quantity: 1 }] }),
    ).toThrow(InvalidValueException);
  });

  it('rejects a line with a negative unitPrice', () => {
    expect(() =>
      Invoice.create({ ...BASE_PROPS, lines: [{ description: 'Item', unitPrice: -1, quantity: 1 }] }),
    ).toThrow(InvalidValueException);
  });

  it('computes the printed full number as SERIES-YEAR-NUMBER padded to 4 digits', () => {
    const invoice = Invoice.create(BASE_PROPS).withNumber('F', 2026, 1);

    expect(invoice.getFullNumber()).toBe('F-2026-0001');
  });

  it('withNumber returns a copy with only series/year/number replaced', () => {
    const invoice = Invoice.create(BASE_PROPS);

    const numbered = invoice.withNumber('F', 2026, 7);

    expect(numbered.getNumber()).toBe(7);
    expect(numbered.getTaxBase()).toBe(invoice.getTaxBase());
    expect(invoice.getNumber()).toBe(0);
  });

  it('withDocumentId returns a copy linked to the mirror document', () => {
    const invoice = Invoice.create(BASE_PROPS);

    const linked = invoice.withDocumentId('document-1');

    expect(linked.getDocumentId()).toBe('document-1');
    expect(invoice.getDocumentId()).toBeNull();
  });

  it('round-trips through toPrimitives/fromPrimitives', () => {
    const invoice = Invoice.create(BASE_PROPS).withNumber('F', 2026, 1);
    const restored = Invoice.fromPrimitives(invoice.toPrimitives());

    expect(restored.toPrimitives()).toEqual(invoice.toPrimitives());
  });
});
