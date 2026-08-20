import { Repository } from 'typeorm';
import { IdGenerator } from '../../../../shared/domain/id-generator.port';
import { InvoiceExtractionHintOrmEntity } from './invoice-extraction-hint.orm-entity';
import { TypeOrmInvoiceHintRepository } from './typeorm-invoice-hint.repository';

describe('TypeOrmInvoiceHintRepository', () => {
  function createRepository(): {
    repository: TypeOrmInvoiceHintRepository;
    ormRepository: { delete: jest.Mock };
  } {
    const ormRepository = { delete: jest.fn() };
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
});
