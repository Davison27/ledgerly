import { UpdateCompanyUseCase } from './update-company.use-case';
import { Company } from '../../domain/company';
import { CompanyRepository } from '../../domain/company.repository';
import { IdGenerator } from '../../../../shared/domain/id-generator.port';

class InMemoryCompanyRepository implements CompanyRepository {
  private company: Company | null = null;

  find(): Promise<Company | null> {
    return Promise.resolve(this.company);
  }

  save(company: Company): Promise<void> {
    this.company = company;
    return Promise.resolve();
  }
}

class SequentialIdGenerator implements IdGenerator {
  private nextId = 1;

  generate(): string {
    return `company-${this.nextId++}`;
  }
}

describe('UpdateCompanyUseCase', () => {
  it('creates a company when none exists yet and persists the given fields', async () => {
    const repository = new InMemoryCompanyRepository();
    const idGenerator = new SequentialIdGenerator();
    const useCase = new UpdateCompanyUseCase(repository, idGenerator);

    const company = await useCase.execute({
      name: 'Acme Corp',
      logo: 'data:image/png;base64,abc123',
    });

    expect(company.getId()).toBe('company-1');
    expect(company.getName()).toBe('Acme Corp');
    expect(company.getLogo()).toBe('data:image/png;base64,abc123');

    const persisted = await repository.find();
    expect(persisted).not.toBeNull();
    expect(persisted?.getName()).toBe('Acme Corp');
  });

  it('creates a company with an empty name when the command has none', async () => {
    const repository = new InMemoryCompanyRepository();
    const idGenerator = new SequentialIdGenerator();
    const useCase = new UpdateCompanyUseCase(repository, idGenerator);

    const company = await useCase.execute({ logo: 'data:image/png;base64,abc123' });

    expect(company.getName()).toBe('');
    expect(company.getLogo()).toBe('data:image/png;base64,abc123');
  });

  it('updates the existing company instead of creating a new one', async () => {
    const repository = new InMemoryCompanyRepository();
    const idGenerator = new SequentialIdGenerator();
    const useCase = new UpdateCompanyUseCase(repository, idGenerator);

    const created = await useCase.execute({ name: 'Acme Corp' });
    const updated = await useCase.execute({ name: 'Acme Corp Updated' });

    expect(updated.getId()).toBe(created.getId());
    expect(updated.getName()).toBe('Acme Corp Updated');
  });

  it('persists the brand colour', async () => {
    const repository = new InMemoryCompanyRepository();
    const idGenerator = new SequentialIdGenerator();
    const useCase = new UpdateCompanyUseCase(repository, idGenerator);

    const company = await useCase.execute({ name: 'Acme Corp', brandColor: '#7A3FA0' });

    expect(company.getBrandColor()).toBe('#7A3FA0');

    const persisted = await repository.find();
    expect(persisted?.getBrandColor()).toBe('#7A3FA0');
  });

  it('does not overwrite the brand colour when it is not part of the command', async () => {
    const repository = new InMemoryCompanyRepository();
    const idGenerator = new SequentialIdGenerator();
    const useCase = new UpdateCompanyUseCase(repository, idGenerator);

    await useCase.execute({ name: 'Acme Corp', brandColor: '#7A3FA0' });
    const updated = await useCase.execute({ name: 'Acme Corp Updated' });

    expect(updated.getBrandColor()).toBe('#7A3FA0');
  });
});
