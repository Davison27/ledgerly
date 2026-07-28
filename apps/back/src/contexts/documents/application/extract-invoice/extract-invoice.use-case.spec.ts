import { ExtractInvoiceUseCase } from './extract-invoice.use-case';
import { ExtractInvoiceCommand } from './extract-invoice.command';
import { PdfReader, PdfReadResult } from '../../domain/extraction/pdf-reader.port';
import { PdfNoTextLayerException } from '../../domain/errors/pdf-no-text-layer.exception';
import { FACTURAE_SAMPLE_XML } from '../../domain/extraction/__fixtures__/facturae-sample.xml';
import { FACTURX_SAMPLE_XML } from '../../domain/extraction/__fixtures__/facturx-sample.xml';
import { InvoiceHintRepository } from '../../domain/extraction/hints/invoice-hint.repository';
import { DomainEvent } from '../../../../shared/domain/domain-event';
import { DomainEventPublisher } from '../../../../shared/domain/domain-event-publisher.port';
import { InvoiceExtractionFailedEvent } from '../../domain/events/invoice-extraction-failed.event';

class FakePdfReader implements PdfReader {
  constructor(private readonly result: PdfReadResult) {}

  read(): Promise<PdfReadResult> {
    return Promise.resolve(this.result);
  }
}

class NoHintsRepository implements InvoiceHintRepository {
  findByIssuer = () => Promise.resolve([]);
  findAll = () => Promise.resolve([]);
  upsert = () => Promise.resolve();
  delete = () => Promise.resolve();
}

class FakeDomainEventPublisher implements DomainEventPublisher {
  published: DomainEvent[] = [];

  publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events);
    return Promise.resolve();
  }

  register(): void {}
}

function buildCommand(fileBuffer: Buffer, fileName = 'invoice.pdf'): ExtractInvoiceCommand {
  return { fileBuffer, fileName, fileSize: fileBuffer.length };
}

describe('ExtractInvoiceUseCase', () => {
  it('prefers a Facturae attachment over the text layer when both are present', async () => {
    const useCase = new ExtractInvoiceUseCase(
      new FakePdfReader({
        text: 'Some unrelated text layer that would parse as heuristic',
        attachments: [{ filename: 'facturae.xml', content: Buffer.from(FACTURAE_SAMPLE_XML, 'utf-8') }],
      }),
      new NoHintsRepository(),
      new FakeDomainEventPublisher(),
    );

    const result = await useCase.execute(buildCommand(Buffer.from('fake-pdf')));

    expect(result.source).toBe('facturae');
    expect(result.confidence).toBe('high');
    expect(result.warnings).toEqual([]);
    expect(result.fields.issuerName).toBe('Consultoria Iberica de Sistemas SA');
    expect(result.fields.invoiceNumber).toBe('2026-045');
    expect(result.fields.amount).toBe(605);
    expect(result.fields.type).toBe('factura');
    expect(result.fields.name).toBe('Consultoria Iberica de Sistemas SA - 2026-045');
  });

  it('parses a Factur-X attachment when no Facturae document is present', async () => {
    const useCase = new ExtractInvoiceUseCase(
      new FakePdfReader({
        text: '',
        attachments: [{ filename: 'factur-x.xml', content: Buffer.from(FACTURX_SAMPLE_XML, 'utf-8') }],
      }),
      new NoHintsRepository(),
      new FakeDomainEventPublisher(),
    );

    const result = await useCase.execute(buildCommand(Buffer.from('fake-pdf')));

    expect(result.source).toBe('facturx');
    expect(result.confidence).toBe('high');
    expect(result.fields.invoiceNumber).toBe('FX-2026-000123');
    expect(result.fields.amount).toBe(1210);
  });

  it('falls back to text-layer heuristics when there is no structured attachment', async () => {
    const useCase = new ExtractInvoiceUseCase(
      new FakePdfReader({
        text: ['Mi Empresa SL', 'CIF: B12345678', 'Factura numero de factura: F-1', 'TOTAL: 100,00 EUR'].join('\n'),
        attachments: [],
      }),
      new NoHintsRepository(),
      new FakeDomainEventPublisher(),
    );

    const result = await useCase.execute(buildCommand(Buffer.from('fake-pdf')));

    expect(result.source).toBe('heuristic');
    expect(result.confidence).toBe('partial');
    expect(result.fields.amount).toBe(100);
    expect(result.fields.type).toBe('factura');
  });

  it('reports "low" confidence when heuristics found no supporting fields', async () => {
    const useCase = new ExtractInvoiceUseCase(
      new FakePdfReader({
        text: 'Unrelated text with no invoice-like structure at all.',
        attachments: [],
      }),
      new NoHintsRepository(),
      new FakeDomainEventPublisher(),
    );

    const result = await useCase.execute(buildCommand(Buffer.from('fake-pdf')));

    expect(result.source).toBe('heuristic');
    expect(result.confidence).toBe('low');
  });

  it('throws PdfNoTextLayerException when there is no text and no structured attachment', async () => {
    const publisher = new FakeDomainEventPublisher();
    const useCase = new ExtractInvoiceUseCase(
      new FakePdfReader({
        text: '   \n  ',
        attachments: [],
      }),
      new NoHintsRepository(),
      publisher,
    );

    await expect(
      useCase.execute(buildCommand(Buffer.from('fake-pdf'), 'unreadable.pdf')),
    ).rejects.toThrow(PdfNoTextLayerException);

    expect(publisher.published).toHaveLength(1);
    const [event] = publisher.published as InvoiceExtractionFailedEvent[];
    expect(event.name).toBe(InvoiceExtractionFailedEvent.EVENT_NAME);
    expect(event.fileName).toBe('unreadable.pdf');
  });

  it('ignores non-XML / unrelated attachments and falls back to heuristics', async () => {
    const useCase = new ExtractInvoiceUseCase(
      new FakePdfReader({
        text: 'CIF: B12345678\nTOTAL: 50,00 EUR',
        attachments: [{ filename: 'logo.png', content: Buffer.from([0x89, 0x50, 0x4e, 0x47]) }],
      }),
      new NoHintsRepository(),
      new FakeDomainEventPublisher(),
    );

    const result = await useCase.execute(buildCommand(Buffer.from('fake-pdf')));

    expect(result.source).toBe('heuristic');
  });

  it('applies a learned hint for the issuer to override a heuristically-extracted field', async () => {
    class SingleHintRepository implements InvoiceHintRepository {
      findByIssuer = (issuerName: string) =>
        Promise.resolve(
          issuerName === 'MI EMPRESA SL'
            ? [
                {
                  id: 'hint-1',
                  issuerName: 'MI EMPRESA SL',
                  field: 'invoiceNumber' as const,
                  anchorKind: 'inline' as const,
                  anchorLabel: 'Ref interna',
                  lineOffset: 0,
                  sampleValue: 'REF-9',
                  occurrences: 3,
                },
              ]
            : [],
        );
      findAll = () => Promise.resolve([]);
      upsert = () => Promise.resolve();
      delete = () => Promise.resolve();
    }

    const useCase = new ExtractInvoiceUseCase(
      new FakePdfReader({
        text: ['Mi Empresa SL', 'CIF: B12345678', 'Ref interna: REF-9', 'TOTAL: 100,00 EUR'].join('\n'),
        attachments: [],
      }),
      new SingleHintRepository(),
      new FakeDomainEventPublisher(),
    );

    const result = await useCase.execute(buildCommand(Buffer.from('fake-pdf')));

    expect(result.source).toBe('heuristic');
    expect(result.fields.invoiceNumber).toBe('REF-9');
  });
});
