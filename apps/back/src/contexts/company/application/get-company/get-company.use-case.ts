import { Inject, Injectable } from '@nestjs/common';
import { Company } from '../../domain/company';
import { CompanyNotFoundException } from '../../domain/errors/company-not-found.exception';
import { COMPANY_REPOSITORY, CompanyRepository } from '../../domain/company.repository';

@Injectable()
export class GetCompanyUseCase {
  constructor(@Inject(COMPANY_REPOSITORY) private readonly repository: CompanyRepository) {}

  async execute(): Promise<Company> {
    const company = await this.repository.find();

    if (!company) {
      throw new CompanyNotFoundException();
    }

    return company;
  }
}
