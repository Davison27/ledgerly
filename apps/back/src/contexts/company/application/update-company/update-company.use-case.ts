import { Inject, Injectable } from '@nestjs/common';
import { Company } from '../../domain/company';
import { COMPANY_REPOSITORY, CompanyRepository } from '../../domain/company.repository';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import { UpdateCompanyCommand } from './update-company.command';

@Injectable()
export class UpdateCompanyUseCase {
  constructor(
    @Inject(COMPANY_REPOSITORY) private readonly repository: CompanyRepository,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: UpdateCompanyCommand): Promise<Company> {
    const existing = await this.repository.find();

    const company =
      existing ??
      Company.create({
        id: this.idGenerator.generate(),
        name: command.name ?? '',
      });

    if (command.name !== undefined) {
      company.rename(command.name);
    }

    if (command.legalName !== undefined) {
      company.changeLegalName(command.legalName);
    }

    if (command.taxId !== undefined) {
      company.changeTaxId(command.taxId);
    }

    if (command.sector !== undefined) {
      company.changeSector(command.sector);
    }

    if (command.email !== undefined) {
      company.changeEmail(command.email);
    }

    if (command.phone !== undefined) {
      company.changePhone(command.phone);
    }

    if (command.website !== undefined) {
      company.changeWebsite(command.website);
    }

    if (command.address !== undefined) {
      company.changeAddress(command.address);
    }

    if (command.city !== undefined) {
      company.changeCity(command.city);
    }

    if (command.postalCode !== undefined) {
      company.changePostalCode(command.postalCode);
    }

    if (command.country !== undefined) {
      company.changeCountry(command.country);
    }

    if (command.logo !== undefined) {
      company.changeLogo(command.logo);
    }

    await this.repository.save(company);

    return company;
  }
}
