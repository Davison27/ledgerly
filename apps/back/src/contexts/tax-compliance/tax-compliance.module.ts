import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectOrmEntity } from '../projects/infrastructure/persistence/project.orm-entity';
import { GetTaxClientProfileUseCase } from './application/get-tax-client-profile.use-case';
import { GetTaxComplianceSettingsUseCase } from './application/get-tax-compliance-settings.use-case';
import { ListTaxClientProfilesUseCase } from './application/list-tax-client-profiles.use-case';
import { ListTaxDeadlinesUseCase } from './application/list-tax-deadlines.use-case';
import { ListTaxObligationCatalogUseCase } from './application/list-tax-obligation-catalog.use-case';
import { ListTaxSourceStatesUseCase } from './application/list-tax-source-states.use-case';
import { RefreshTaxSourcesUseCase } from './application/refresh-tax-sources.use-case';
import { ReviewTaxSourceUseCase } from './application/review-tax-source.use-case';
import { SaveTaxClientProfileUseCase } from './application/save-tax-client-profile.use-case';
import { UpdateTaxComplianceSettingsUseCase } from './application/update-tax-compliance-settings.use-case';
import { TAX_CLIENT_PROFILE_REPOSITORY } from './domain/tax-client-profile.repository';
import { TAX_COMPLIANCE_SETTINGS_REPOSITORY } from './domain/tax-compliance-settings.repository';
import { TAX_DEADLINE_REPOSITORY } from './domain/tax-deadline.repository';
import { TaxClientProfileOrmEntity } from './infrastructure/persistence/tax-client-profile.orm-entity';
import { TaxComplianceSettingsOrmEntity } from './infrastructure/persistence/tax-compliance-settings.orm-entity';
import { TaxDeadlineOccurrenceOrmEntity } from './infrastructure/persistence/tax-deadline-occurrence.orm-entity';
import { TaxSourceStateOrmEntity } from './infrastructure/persistence/tax-source-state.orm-entity';
import { TypeOrmTaxClientProfileRepository } from './infrastructure/persistence/typeorm-tax-client-profile.repository';
import { TypeOrmTaxComplianceSettingsRepository } from './infrastructure/persistence/typeorm-tax-compliance-settings.repository';
import { TypeOrmTaxDeadlineRepository } from './infrastructure/persistence/typeorm-tax-deadline.repository';
import { TypeOrmTaxSourceRepository } from './infrastructure/persistence/typeorm-tax-source.repository';
import { TaxComplianceController } from './infrastructure/http/tax-compliance.controller';
import { AeatTaxSourceFetcher } from './infrastructure/source/aeat-tax-source-fetcher';
import { TaxComplianceSourceMonitor } from './infrastructure/source/tax-compliance-source-monitor.service';
import { TAX_SOURCE_FETCHER } from './domain/tax-source-fetcher';
import { TAX_SOURCE_REPOSITORY } from './domain/tax-source.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaxComplianceSettingsOrmEntity,
      TaxClientProfileOrmEntity,
      TaxDeadlineOccurrenceOrmEntity,
      TaxSourceStateOrmEntity,
      ProjectOrmEntity,
    ]),
  ],
  controllers: [TaxComplianceController],
  providers: [
    GetTaxComplianceSettingsUseCase,
    UpdateTaxComplianceSettingsUseCase,
    ListTaxObligationCatalogUseCase,
    ListTaxClientProfilesUseCase,
    GetTaxClientProfileUseCase,
    SaveTaxClientProfileUseCase,
    ListTaxDeadlinesUseCase,
    ListTaxSourceStatesUseCase,
    RefreshTaxSourcesUseCase,
    ReviewTaxSourceUseCase,
    TaxComplianceSourceMonitor,
    {
      provide: TAX_COMPLIANCE_SETTINGS_REPOSITORY,
      useClass: TypeOrmTaxComplianceSettingsRepository,
    },
    { provide: TAX_CLIENT_PROFILE_REPOSITORY, useClass: TypeOrmTaxClientProfileRepository },
    { provide: TAX_DEADLINE_REPOSITORY, useClass: TypeOrmTaxDeadlineRepository },
    { provide: TAX_SOURCE_REPOSITORY, useClass: TypeOrmTaxSourceRepository },
    { provide: TAX_SOURCE_FETCHER, useClass: AeatTaxSourceFetcher },
  ],
})
export class TaxComplianceModule {}
