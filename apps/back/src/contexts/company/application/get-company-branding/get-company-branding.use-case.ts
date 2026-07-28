import { Inject, Injectable } from '@nestjs/common';
import { COMPANY_REPOSITORY, CompanyRepository } from '../../domain/company.repository';
import { CompanyBranding } from './company-branding';

@Injectable()
export class GetCompanyBrandingUseCase {
  constructor(@Inject(COMPANY_REPOSITORY) private readonly repository: CompanyRepository) {}

  async execute(): Promise<CompanyBranding> {
    const company = await this.repository.find();

    if (!company) {
      return { name: '', logo: null, brandColor: null };
    }

    return {
      name: company.getName(),
      logo: company.getLogo(),
      brandColor: company.getBrandColor(),
    };
  }
}
