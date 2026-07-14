import { Inject, Injectable } from '@nestjs/common';
import { Company } from '../../domain/company';
import { CompanyNotFoundException } from '../../domain/errors/company-not-found.exception';
import { COMPANY_REPOSITORY, CompanyRepository } from '../../domain/company.repository';
import { UpdateCompanyCommand } from './update-company.command';

@Injectable()
export class UpdateCompanyUseCase {
  constructor(@Inject(COMPANY_REPOSITORY) private readonly repository: CompanyRepository) {}

  async execute(command: UpdateCompanyCommand): Promise<Company> {
    const company = await this.repository.find();

    if (!company) {
      throw new CompanyNotFoundException();
    }

    if (command.name !== undefined) {
      company.rename(command.name);
    }

    if (command.sector !== undefined) {
      company.changeSector(command.sector);
    }

    if (command.color !== undefined) {
      company.changeColor(command.color);
    }

    await this.repository.save(company);

    return company;
  }
}
