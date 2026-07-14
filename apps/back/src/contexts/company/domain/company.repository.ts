import { Company } from './company';

export const COMPANY_REPOSITORY = Symbol('CompanyRepository');

export interface CompanyRepository {
  find(): Promise<Company | null>;
  save(company: Company): Promise<void>;
}
