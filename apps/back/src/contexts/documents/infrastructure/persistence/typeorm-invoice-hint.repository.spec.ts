import { Repository } from 'typeorm';
import { IdGenerator } from '../../../../shared/domain/id-generator.port';
import { InvoiceExtractionHintOrmEntity } from './invoice-extraction-hint.orm-entity';
import { TypeOrmInvoiceHintRepository } from './typeorm-invoice-hint.repository';

function buildOrmHint(overrides: Partial<InvoiceExtractionHintOrmEntity> = {}): InvoiceExtractionHintOrmEntity {
  const orm = new InvoiceExtractionHintOrmEntity();
  orm.id = 'hint-1';
  orm.issuerName = 'MI EMPRESA SL';
  orm.issuerTaxId = null;
  orm.field = 'invoiceNumber';
  orm.anchorKind = 'inline';
  orm.anchorLabel = 'Ref interna';
  orm.lineOffset = 0;
  orm.sampleValue = 'REF-9';
  orm.occurrences = 1;
  orm.createdAt = new Date('2026-01-01T00:00:00.000Z');
  orm.updatedAt = new Date('2026-01-01T00:00:00.000Z');
  return Object.assign(orm, overrides);
}

describe('TypeOrmInvoiceHintRepository', () => {
  function createRepository(): {
    repository: TypeOrmInvoiceHintRepository;
    ormRepository: { delete: jest.Mock; find: jest.Mock; findOne: jest.Mock; save: jest.Mock };
  } {
    const ormRepository = { delete: jest.fn(), find: jest.fn(), findOne: jest.fn(), save: jest.fn() };
    const idGenerator: IdGenerator = { generate: () => 'generated-id' };

    return {
      repository: new TypeOrmInvoiceHintRepository(
        ormRepository as unknown as Repository<InvoiceExtractionHintOrmEntity>,
        idGenerator,
      ),
      ormRepository,
    };
  }

  it('reports true when TypeORM deletes one hint', async () => {
    const { repository, ormRepository } = createRepository();
    ormRepository.delete.mockResolvedValue({ affected: 1 });

    await expect(repository.delete('hint-1')).resolves.toBe(true);
    expect(ormRepository.delete).toHaveBeenCalledWith({ id: 'hint-1' });
  });

  it('reports false when TypeORM deletes no hint', async () => {
    const { repository, ormRepository } = createRepository();
    ormRepository.delete.mockResolvedValue({ affected: 0 });

    await expect(repository.delete('missing-hint')).resolves.toBe(false);
    expect(ormRepository.delete).toHaveBeenCalledWith({ id: 'missing-hint' });
  });

  it('finds hints by issuer tax id', async () => {
    const { repository, ormRepository } = createRepository();
    ormRepository.find.mockResolvedValue([buildOrmHint({ issuerTaxId: 'B12345674' })]);

    const hints = await repository.findByIssuerTaxId('B12345674');

    expect(ormRepository.find).toHaveBeenCalledWith({ where: { issuerTaxId: 'B12345674' } });
    expect(hints).toEqual([expect.objectContaining({ issuerTaxId: 'B12345674' })]);
  });

  it('creates a new hint carrying the issuer tax id when none exists yet', async () => {
    const { repository, ormRepository } = createRepository();
    ormRepository.findOne.mockResolvedValue(null);
    ormRepository.save.mockImplementation((orm: InvoiceExtractionHintOrmEntity) => Promise.resolve(orm));

    await repository.upsert({
      issuerName: 'MI EMPRESA SL',
      issuerTaxId: 'B12345674',
      field: 'invoiceNumber',
      anchorKind: 'inline',
      anchorLabel: 'Ref interna',
      lineOffset: 0,
      sampleValue: 'REF-9',
    });

    expect(ormRepository.findOne).toHaveBeenCalledWith({
      where: { issuerTaxId: 'B12345674', field: 'invoiceNumber' },
    });
    expect(ormRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'generated-id', issuerTaxId: 'B12345674', occurrences: 1 }),
    );
  });

  it('attaches the issuer tax id to a row it only finds by issuer name, without violating the name index', async () => {
    const { repository, ormRepository } = createRepository();
    const existing = buildOrmHint({ issuerTaxId: null });
    ormRepository.findOne.mockImplementation(({ where }: { where: Record<string, unknown> }) =>
      Promise.resolve('issuerTaxId' in where ? null : existing),
    );
    ormRepository.save.mockImplementation((orm: InvoiceExtractionHintOrmEntity) => Promise.resolve(orm));

    await repository.upsert({
      issuerName: 'MI EMPRESA SL',
      issuerTaxId: 'B12345674',
      field: 'invoiceNumber',
      anchorKind: 'inline',
      anchorLabel: 'Ref interna',
      lineOffset: 0,
      sampleValue: 'REF-9',
    });

    expect(ormRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'hint-1', issuerTaxId: 'B12345674', occurrences: 2 }),
    );
  });

  it('keeps a previously learned issuer tax id when a later correction has none', async () => {
    const { repository, ormRepository } = createRepository();
    const existing = buildOrmHint({ issuerTaxId: 'B12345674' });
    ormRepository.findOne.mockResolvedValue(existing);
    ormRepository.save.mockImplementation((orm: InvoiceExtractionHintOrmEntity) => Promise.resolve(orm));

    await repository.upsert({
      issuerName: 'MI EMPRESA SL',
      field: 'invoiceNumber',
      anchorKind: 'inline',
      anchorLabel: 'Ref interna',
      lineOffset: 0,
      sampleValue: 'REF-9',
    });

    expect(ormRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ issuerTaxId: 'B12345674' }),
    );
  });
});
