import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyDocumentTypeOrmEntity } from './company-document-type.orm-entity';

export const SYSTEM_COMPANY_DOCUMENT_TYPES: readonly Pick<CompanyDocumentTypeOrmEntity, 'id' | 'code' | 'name' | 'isSystem'>[] = [
  { id: '10000000-0000-4000-8000-000000000001', code: 'civil_liability_policy', name: 'Civil liability policy', isSystem: true },
  { id: '10000000-0000-4000-8000-000000000002', code: 'civil_liability_payment', name: 'Civil liability payment', isSystem: true },
  { id: '10000000-0000-4000-8000-000000000003', code: 'occupational_risk_prevention', name: 'Occupational risk prevention', isSystem: true },
  { id: '10000000-0000-4000-8000-000000000004', code: 'risk_assessment', name: 'Risk assessment', isSystem: true },
  { id: '10000000-0000-4000-8000-000000000005', code: 'risk_planning', name: 'Risk planning', isSystem: true },
  { id: '10000000-0000-4000-8000-000000000006', code: 'preventive_resource', name: 'Preventive resource', isSystem: true },
  { id: '10000000-0000-4000-8000-000000000007', code: 'tax_debt_certificate', name: 'Tax debt certificate', isSystem: true },
  { id: '10000000-0000-4000-8000-000000000008', code: 'social_security_debt_certificate', name: 'Social security debt certificate', isSystem: true },
  { id: '10000000-0000-4000-8000-000000000009', code: 'bank_account_ownership_certificate', name: 'Bank account ownership certificate', isSystem: true },
];

@Injectable()
export class CompanyDocumentTypeCatalogInitializer implements OnApplicationBootstrap {
  private readonly logger = new Logger(CompanyDocumentTypeCatalogInitializer.name);

  constructor(
    @InjectRepository(CompanyDocumentTypeOrmEntity)
    private readonly repository: Repository<CompanyDocumentTypeOrmEntity>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.repository.upsert([...SYSTEM_COMPANY_DOCUMENT_TYPES], ['code']);
    this.logger.log(`Ensured ${SYSTEM_COMPANY_DOCUMENT_TYPES.length} company document types`);
  }
}
