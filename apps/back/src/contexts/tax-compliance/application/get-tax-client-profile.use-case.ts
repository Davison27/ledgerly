import { Inject, Injectable } from '@nestjs/common';
import {
  TAX_CLIENT_PROFILE_REPOSITORY,
  TaxClientProfileRepository,
} from '../domain/tax-client-profile.repository';
import { TaxClientProfilePrimitives } from '../domain/tax-client-profile';

@Injectable()
export class GetTaxClientProfileUseCase {
  constructor(
    @Inject(TAX_CLIENT_PROFILE_REPOSITORY)
    private readonly repository: TaxClientProfileRepository,
  ) {}

  execute(projectId: string): Promise<TaxClientProfilePrimitives | null> {
    return this.repository.findByProjectId(projectId);
  }
}
