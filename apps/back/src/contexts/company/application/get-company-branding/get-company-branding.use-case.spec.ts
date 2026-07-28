import { GetCompanyBrandingUseCase } from './get-company-branding.use-case';
import { Company } from '../../domain/company';
import { CompanyRepository } from '../../domain/company.repository';

class InMemoryCompanyRepository implements CompanyRepository {
  constructor(private company: Company | null) {}

  find(): Promise<Company | null> {
    return Promise.resolve(this.company);
  }

  save(company: Company): Promise<void> {
    this.company = company;
    return Promise.resolve();
  }
}

describe('GetCompanyBrandingUseCase', () => {
  it('returns empty defaults when there is no company yet', async () => {
    const useCase = new GetCompanyBrandingUseCase(new InMemoryCompanyRepository(null));

    const branding = await useCase.execute();

    expect(branding).toEqual({ name: '', logo: null, brandColor: null });
  });

  it('returns exactly the three branding fields from the company', async () => {
    const company = Company.create({
      id: 'company-1',
      name: 'Acme Corp',
      taxId: 'B12345678',
      logo: 'data:image/png;base64,abc123',
      brandColor: '#7A3FA0',
    });
    const useCase = new GetCompanyBrandingUseCase(new InMemoryCompanyRepository(company));

    const branding = await useCase.execute();

    expect(branding).toEqual({
      name: 'Acme Corp',
      logo: 'data:image/png;base64,abc123',
      brandColor: '#7A3FA0',
    });
  });
});
