import { TaxSourceStatePrimitives } from './tax-source-state';

export const TAX_SOURCE_REPOSITORY = Symbol('TaxSourceRepository');

export interface TaxSourceRepository {
  findAll(): Promise<TaxSourceStatePrimitives[]>;
  findByKey(sourceKey: string): Promise<TaxSourceStatePrimitives | null>;
  save(state: TaxSourceStatePrimitives): Promise<void>;
}
