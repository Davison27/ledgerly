import { TaxClientProfilePrimitives } from './tax-client-profile';

export const TAX_CLIENT_PROFILE_REPOSITORY = Symbol('TaxClientProfileRepository');

export interface TaxClientProfileRepository {
  findAll(): Promise<TaxClientProfilePrimitives[]>;
  findByProjectId(projectId: string): Promise<TaxClientProfilePrimitives | null>;
  save(profile: TaxClientProfilePrimitives): Promise<void>;
}
