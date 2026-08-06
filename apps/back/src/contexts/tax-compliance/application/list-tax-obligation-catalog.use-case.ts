import { Injectable } from '@nestjs/common';
import { TAX_OBLIGATION_CATALOG } from '../domain/tax-obligation-catalog';

@Injectable()
export class ListTaxObligationCatalogUseCase {
  execute() {
    return TAX_OBLIGATION_CATALOG;
  }
}
