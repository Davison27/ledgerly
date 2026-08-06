import { Inject, Injectable } from '@nestjs/common';
import {
  TAX_CLIENT_PROFILE_REPOSITORY,
  TaxClientProfileRepository,
} from '../domain/tax-client-profile.repository';
import { TaxClientProfilePrimitives } from '../domain/tax-client-profile';

@Injectable()
export class ListTaxClientProfilesUseCase {
  constructor(
    @Inject(TAX_CLIENT_PROFILE_REPOSITORY)
    private readonly repository: TaxClientProfileRepository,
  ) {}

  execute(): Promise<TaxClientProfilePrimitives[]> {
    return this.repository.findAll();
  }
}
