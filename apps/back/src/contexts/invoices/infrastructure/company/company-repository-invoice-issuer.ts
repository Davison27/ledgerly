import { Inject, Injectable } from '@nestjs/common';
import { COMPANY_REPOSITORY, CompanyRepository } from '../../../company/domain/company.repository';
import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';
import { InvoiceIssuer, InvoiceIssuerProvider } from '../../domain/invoice-issuer.port';

@Injectable()
export class CompanyRepositoryInvoiceIssuer implements InvoiceIssuerProvider {
  constructor(@Inject(COMPANY_REPOSITORY) private readonly companyRepository: CompanyRepository) {}

  // D8: a factura cannot be issued with an incomplete company profile. The
  // front disables "Nueva factura" for the same reason, but this is the
  // guarantee that actually holds regardless of what the front does.
  async get(): Promise<InvoiceIssuer> {
    const company = await this.companyRepository.find();

    if (!company || !company.getName() || !company.getTaxId()) {
      throw new InvalidValueException(
        'company must have a name and a taxId to issue invoices',
      );
    }

    return {
      name: company.getName(),
      legalName: company.getLegalName(),
      taxId: company.getTaxId() as string,
      address: company.getAddress(),
      city: company.getCity(),
      postalCode: company.getPostalCode(),
      country: company.getCountry(),
      email: company.getEmail(),
      phone: company.getPhone(),
      website: company.getWebsite(),
      logo: company.getLogo(),
    };
  }
}
