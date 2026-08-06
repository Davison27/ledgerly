import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Authenticated } from '../../../../shared/infrastructure/http/access/authenticated.decorator';
import { RequiresAccess } from '../../../../shared/infrastructure/http/access/requires-access.decorator';
import { RequiresAdmin } from '../../../../shared/infrastructure/http/access/requires-admin.decorator';
import { GetTaxClientProfileUseCase } from '../../application/get-tax-client-profile.use-case';
import { GetTaxComplianceSettingsUseCase } from '../../application/get-tax-compliance-settings.use-case';
import { ListTaxClientProfilesUseCase } from '../../application/list-tax-client-profiles.use-case';
import { ListTaxDeadlinesUseCase } from '../../application/list-tax-deadlines.use-case';
import { ListTaxObligationCatalogUseCase } from '../../application/list-tax-obligation-catalog.use-case';
import { SaveTaxClientProfileUseCase } from '../../application/save-tax-client-profile.use-case';
import { UpdateTaxComplianceSettingsUseCase } from '../../application/update-tax-compliance-settings.use-case';
import { ListTaxDeadlinesQueryDto } from './dtos/list-tax-deadlines.query.dto';
import { SaveTaxClientProfileDto } from './dtos/save-tax-client-profile.dto';
import { UpdateTaxComplianceSettingsDto } from './dtos/update-tax-compliance-settings.dto';
import { ListTaxSourceStatesUseCase } from '../../application/list-tax-source-states.use-case';
import { RefreshTaxSourcesUseCase } from '../../application/refresh-tax-sources.use-case';
import { ReviewTaxSourceUseCase } from '../../application/review-tax-source.use-case';

@Authenticated()
@Controller('tax-compliance')
export class TaxComplianceController {
  constructor(
    private readonly getSettingsUseCase: GetTaxComplianceSettingsUseCase,
    private readonly updateSettingsUseCase: UpdateTaxComplianceSettingsUseCase,
    private readonly listCatalogUseCase: ListTaxObligationCatalogUseCase,
    private readonly listProfilesUseCase: ListTaxClientProfilesUseCase,
    private readonly getProfileUseCase: GetTaxClientProfileUseCase,
    private readonly saveProfileUseCase: SaveTaxClientProfileUseCase,
    private readonly listDeadlinesUseCase: ListTaxDeadlinesUseCase,
    private readonly listSourceStatesUseCase: ListTaxSourceStatesUseCase,
    private readonly refreshSourcesUseCase: RefreshTaxSourcesUseCase,
    private readonly reviewSourceUseCase: ReviewTaxSourceUseCase,
  ) {}

  @Get('settings')
  async settings() {
    return this.getSettingsUseCase.execute();
  }

  @RequiresAdmin()
  @Patch('settings')
  async updateSettings(@Body() dto: UpdateTaxComplianceSettingsDto) {
    return this.updateSettingsUseCase.execute({
      enabled: dto.enabled,
      internalLeadDays: dto.internalLeadDays,
    });
  }

  @RequiresAdmin()
  @Get('sources')
  sources() {
    return this.listSourceStatesUseCase.execute();
  }

  @RequiresAdmin()
  @Post('sources/refresh')
  refreshSources() {
    return this.refreshSourcesUseCase.execute();
  }

  @RequiresAdmin()
  @Patch('sources/:sourceKey/review')
  reviewSource(@Param('sourceKey') sourceKey: string) {
    return this.reviewSourceUseCase.execute(sourceKey);
  }

  @RequiresAccess('projects', 'view')
  @Get('catalog')
  catalog() {
    return this.listCatalogUseCase.execute();
  }

  @RequiresAccess('projects', 'view')
  @Get('profiles')
  profiles() {
    return this.listProfilesUseCase.execute();
  }

  @RequiresAccess('projects', 'view')
  @Get('profiles/:projectId')
  profile(@Param('projectId') projectId: string) {
    return this.getProfileUseCase.execute(projectId);
  }

  @RequiresAccess('projects', 'edit')
  @Patch('profiles/:projectId')
  async saveProfile(@Param('projectId') projectId: string, @Body() dto: SaveTaxClientProfileDto) {
    return this.saveProfileUseCase.execute({
      projectId,
      countryCode: dto.countryCode,
      regionCode: dto.regionCode,
      entityType: dto.entityType,
      fiscalYearStartMonth: dto.fiscalYearStartMonth,
      timezone: dto.timezone,
      enabled: dto.enabled,
      obligationKeys: dto.obligationKeys,
    });
  }

  @RequiresAccess('calendar', 'view')
  @Get('calendar')
  calendar(@Query() query: ListTaxDeadlinesQueryDto) {
    return this.listDeadlinesUseCase.execute({
      from: query.from,
      to: query.to,
      projectId: query.projectId,
    });
  }
}
