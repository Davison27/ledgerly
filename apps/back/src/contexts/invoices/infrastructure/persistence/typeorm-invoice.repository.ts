import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Invoice } from '../../domain/invoice';
import { InvoiceNumberAllocation, InvoiceRepository } from '../../domain/invoice.repository';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import { InvoiceOrmEntity } from './invoice.orm-entity';
import { InvoiceLineOrmEntity } from './invoice-line.orm-entity';
import { InvoiceMapper } from './invoice.mapper';

@Injectable()
export class TypeOrmInvoiceRepository implements InvoiceRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(InvoiceOrmEntity) private readonly invoiceRepository: Repository<InvoiceOrmEntity>,
    @InjectRepository(InvoiceLineOrmEntity)
    private readonly invoiceLineRepository: Repository<InvoiceLineOrmEntity>,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async findAll(): Promise<Invoice[]> {
    const invoiceOrms = await this.invoiceRepository.find({
      order: { year: 'DESC', number: 'DESC' },
    });

    if (invoiceOrms.length === 0) {
      return [];
    }

    const lineOrms = await this.invoiceLineRepository.find({
      where: invoiceOrms.map((orm) => ({ invoiceId: orm.id })),
    });

    return invoiceOrms.map((orm) =>
      InvoiceMapper.toDomain(
        orm,
        lineOrms.filter((line) => line.invoiceId === orm.id),
      ),
    );
  }

  async findById(id: string): Promise<Invoice | null> {
    const orm = await this.invoiceRepository.findOne({ where: { id } });

    if (!orm) {
      return null;
    }

    const lineOrms = await this.invoiceLineRepository.find({ where: { invoiceId: id } });

    return InvoiceMapper.toDomain(orm, lineOrms);
  }

  async saveWithNumber(invoice: Invoice, allocate: InvoiceNumberAllocation): Promise<Invoice> {
    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1 || $2))', [
        allocate.series,
        String(allocate.year),
      ]);

      const rows: { next: string }[] = await manager.query(
        'SELECT COALESCE(MAX(number), 0) + 1 AS "next" FROM invoices WHERE series = $1 AND year = $2',
        [allocate.series, allocate.year],
      );
      const nextNumber = Number(rows[0].next);

      const numberedInvoice = invoice.withNumber(allocate.series, allocate.year, nextNumber);

      await manager.getRepository(InvoiceOrmEntity).save(InvoiceMapper.toOrm(numberedInvoice));

      const lineIds = numberedInvoice.getLines().map(() => this.idGenerator.generate());
      const lineOrms = InvoiceMapper.linesToOrm(numberedInvoice, lineIds);
      await manager.getRepository(InvoiceLineOrmEntity).save(lineOrms);

      return numberedInvoice;
    });
  }

  async delete(id: string): Promise<void> {
    await this.invoiceRepository.delete({ id });
  }

  async savePdf(id: string, pdf: Buffer): Promise<void> {
    await this.invoiceRepository.update({ id }, { pdf, pdfSize: pdf.length });
  }

  async findPdf(id: string): Promise<Buffer | null> {
    const orm = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select(['invoice.id'])
      .addSelect('invoice.pdf')
      .where('invoice.id = :id', { id })
      .getOne();

    return orm?.pdf ?? null;
  }

  async linkDocument(id: string, documentId: string): Promise<void> {
    await this.invoiceRepository.update({ id }, { documentId });
  }
}
