import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Invoice } from '../../domain/invoice';
import { InvoiceNumberAllocation, InvoiceRepository } from '../../domain/invoice.repository';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import { InvoiceOrmEntity } from './invoice.orm-entity';
import { InvoiceLineOrmEntity } from './invoice-line.orm-entity';
import { InvoiceMapper } from './invoice.mapper';
import { getListLimit, ListLimitExceededException } from '../../../../shared/infrastructure/list-limit';
import { Page, PageRequest, pageOffset } from '../../../../shared/domain/pagination';
import {
  STORED_FILE_CIPHER,
  StoredFileCipher,
  StoredFileEnvelope,
} from '../../../../shared/domain/stored-file-cipher.port';
import { StoredFileCryptographyException } from '../../../../shared/domain/errors/stored-file-cryptography.exception';

@Injectable()
export class TypeOrmInvoiceRepository implements InvoiceRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(InvoiceOrmEntity) private readonly invoiceRepository: Repository<InvoiceOrmEntity>,
    @InjectRepository(InvoiceLineOrmEntity)
    private readonly invoiceLineRepository: Repository<InvoiceLineOrmEntity>,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
    @Inject(STORED_FILE_CIPHER) private readonly storedFileCipher: StoredFileCipher,
  ) {}

  async findAll(): Promise<Invoice[]> {
    const limit = getListLimit('MAX_LIST_ITEMS', 500);
    const invoiceOrms = await this.invoiceRepository.find({
      order: { year: 'DESC', number: 'DESC' },
      take: limit + 1,
    });

    if (invoiceOrms.length > limit) throw new ListLimitExceededException(limit, 'Invoices');

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

  async findPage(request: PageRequest, search?: string): Promise<Page<Invoice>> {
    const queryBuilder = this.invoiceRepository.createQueryBuilder('invoice');
    const normalizedSearch = search?.trim().toLowerCase();
    if (normalizedSearch) {
      queryBuilder.andWhere(
        "(LOWER(invoice.customer_name) LIKE :search OR LOWER(invoice.series || '-' || invoice.year::text || '-' || LPAD(invoice.number::text, 4, '0')) LIKE :search)",
        { search: `%${normalizedSearch}%` },
      );
    }

    const total = await queryBuilder.getCount();
    const invoiceOrms = await queryBuilder
      .orderBy('invoice.year', 'DESC')
      .addOrderBy('invoice.number', 'DESC')
      .addOrderBy('invoice.id', 'DESC')
      .skip(pageOffset(request))
      .take(request.size)
      .getMany();

    if (invoiceOrms.length === 0) {
      return { items: [], total, page: request.page, size: request.size };
    }

    const lineOrms = await this.invoiceLineRepository.find({
      where: invoiceOrms.map((orm) => ({ invoiceId: orm.id })),
    });

    return {
      items: invoiceOrms.map((orm) =>
        InvoiceMapper.toDomain(
          orm,
          lineOrms.filter((line) => line.invoiceId === orm.id),
        ),
      ),
      total,
      page: request.page,
      size: request.size,
    };
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
    const envelope = this.storedFileCipher.encrypt(pdf, {
      store: 'invoicePdf',
      rowId: id,
      mimeType: 'application/pdf',
      plaintextSize: pdf.length,
    });
    const result = await this.invoiceRepository.update(
      { id },
      {
        pdfCiphertext: envelope.ciphertext,
        pdfNonce: envelope.nonce,
        pdfTag: envelope.tag,
        pdfKeyVersion: envelope.version,
        pdfSize: pdf.length,
      },
    );

    if (result.affected !== 1) {
      throw new StoredFileCryptographyException();
    }
  }

  async findPdf(id: string): Promise<Buffer | null> {
    const orm = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select(['invoice.id', 'invoice.pdfSize'])
      .addSelect('invoice.pdfCiphertext')
      .addSelect('invoice.pdfNonce')
      .addSelect('invoice.pdfTag')
      .addSelect('invoice.pdfKeyVersion')
      .where('invoice.id = :id', { id })
      .getOne();

    if (!orm) {
      return null;
    }

    const envelope = this.getPdfEnvelope(orm);

    if (!envelope) {
      return null;
    }

    return this.storedFileCipher.decrypt(envelope, {
      store: 'invoicePdf',
      rowId: orm.id,
      mimeType: 'application/pdf',
      plaintextSize: orm.pdfSize as number,
    });
  }

  async linkDocument(id: string, documentId: string): Promise<void> {
    await this.invoiceRepository.update({ id }, { documentId });
  }

  private getPdfEnvelope(orm: InvoiceOrmEntity): StoredFileEnvelope | null {
    const values = [
      orm.pdfCiphertext,
      orm.pdfNonce,
      orm.pdfTag,
      orm.pdfKeyVersion,
      orm.pdfSize,
    ];

    if (values.every((value) => value === null)) {
      return null;
    }

    if (values.some((value) => value === null)) {
      throw new StoredFileCryptographyException();
    }

    return {
      ciphertext: orm.pdfCiphertext as Buffer,
      nonce: orm.pdfNonce as Buffer,
      tag: orm.pdfTag as Buffer,
      version: orm.pdfKeyVersion as string,
    };
  }
}
