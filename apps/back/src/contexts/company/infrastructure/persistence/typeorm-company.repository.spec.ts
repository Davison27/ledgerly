import { QueryFailedError, Repository } from 'typeorm';
import { UniqueConstraintException } from '../../../../shared/domain/unique-constraint.exception';
import { Company } from '../../domain/company';
import { createStoredFileCipher } from '../../../../shared/infrastructure/crypto/stored-file-cipher';
import { TypeOrmCompanyRepository } from './typeorm-company.repository';
import { CompanyOrmEntity } from './company.orm-entity';

describe('TypeOrmCompanyRepository.save', () => {
  it('maps the singleton unique violation to a domain conflict', async () => {
    const error = new QueryFailedError('INSERT INTO companies', [], {
      code: '23505',
      constraint: 'UQ_companies_singleton',
    } as unknown as Error);
    const save = jest.fn().mockRejectedValue(error);
    const cipher = createStoredFileCipher({
      activeVersion: 'v1',
      keys: new Map([['v1', Buffer.alloc(32, 1)]]),
    });
    const repository = new TypeOrmCompanyRepository(
      { save } as unknown as Repository<CompanyOrmEntity>,
      cipher,
    );
    const company = Company.create({ id: 'company-1', name: 'Acme' });

    await expect(repository.save(company)).rejects.toEqual(
      new UniqueConstraintException('Company', 'singleton', 'true'),
    );
  });

  it('rethrows an unrelated unique violation', async () => {
    const error = new QueryFailedError('INSERT INTO companies', [], {
      code: '23505',
      constraint: 'UQ_companies_other',
    } as unknown as Error);
    const save = jest.fn().mockRejectedValue(error);
    const cipher = createStoredFileCipher({
      activeVersion: 'v1',
      keys: new Map([['v1', Buffer.alloc(32, 1)]]),
    });
    const repository = new TypeOrmCompanyRepository(
      { save } as unknown as Repository<CompanyOrmEntity>,
      cipher,
    );
    const company = Company.create({ id: 'company-1', name: 'Acme' });

    await expect(repository.save(company)).rejects.toBe(error);
  });
});
