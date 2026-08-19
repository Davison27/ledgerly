import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import { InvoiceHint } from '../../domain/extraction/hints/invoice-hint';
import { InvoiceHintRepository, NewInvoiceHint } from '../../domain/extraction/hints/invoice-hint.repository';
import { InvoiceExtractionHintMapper } from './invoice-extraction-hint.mapper';
import { InvoiceExtractionHintOrmEntity } from './invoice-extraction-hint.orm-entity';
import { getListLimit, ListLimitExceededException } from '../../../../shared/infrastructure/list-limit';
import { Page, PageRequest, pageOffset } from '../../../../shared/domain/pagination';

@Injectable()
export class TypeOrmInvoiceHintRepository implements InvoiceHintRepository {
  constructor(
    @InjectRepository(InvoiceExtractionHintOrmEntity)
    private readonly repository: Repository<InvoiceExtractionHintOrmEntity>,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async findByIssuer(issuerName: string): Promise<InvoiceHint[]> {
    const orms = await this.repository.find({ where: { issuerName } });

    return orms.map((orm) => InvoiceExtractionHintMapper.toDomain(orm));
  }

  async findAll(): Promise<InvoiceHint[]> {
    const limit = getListLimit('MAX_LIST_ITEMS', 500);
    const orms = await this.repository.find({
      order: { issuerName: 'ASC', field: 'ASC' },
      take: limit + 1,
    });

    if (orms.length > limit) throw new ListLimitExceededException(limit, 'Extraction hints');

    return orms.map((orm) => InvoiceExtractionHintMapper.toDomain(orm));
  }

  async findPage(request: PageRequest): Promise<Page<InvoiceHint>> {
    const total = await this.repository.count();
    const orms = await this.repository.find({
      order: { issuerName: 'ASC', field: 'ASC', id: 'ASC' },
      skip: pageOffset(request),
      take: request.size,
    });

    return {
      items: orms.map((orm) => InvoiceExtractionHintMapper.toDomain(orm)),
      total,
      page: request.page,
      size: request.size,
    };
  }

  async upsert(hint: NewInvoiceHint): Promise<void> {
    const existing = await this.repository.findOne({
      where: { issuerName: hint.issuerName, field: hint.field },
    });

    const now = new Date();

    if (existing) {
      const sameAnchor =
        existing.anchorKind === hint.anchorKind &&
        existing.anchorLabel === hint.anchorLabel &&
        existing.lineOffset === hint.lineOffset;

      existing.anchorKind = hint.anchorKind;
      existing.anchorLabel = hint.anchorLabel;
      existing.lineOffset = hint.lineOffset;
      existing.sampleValue = hint.sampleValue;
      existing.occurrences = sameAnchor ? existing.occurrences + 1 : 1;
      existing.updatedAt = now;

      await this.repository.save(existing);
      return;
    }

    const orm = new InvoiceExtractionHintOrmEntity();
    orm.id = this.idGenerator.generate();
    orm.issuerName = hint.issuerName;
    orm.field = hint.field;
    orm.anchorKind = hint.anchorKind;
    orm.anchorLabel = hint.anchorLabel;
    orm.lineOffset = hint.lineOffset;
    orm.sampleValue = hint.sampleValue;
    orm.occurrences = 1;
    orm.createdAt = now;
    orm.updatedAt = now;

    await this.repository.save(orm);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }
}
