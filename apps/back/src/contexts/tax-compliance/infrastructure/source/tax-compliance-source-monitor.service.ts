import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  TAX_COMPLIANCE_SETTINGS_REPOSITORY,
  TaxComplianceSettingsRepository,
} from '../../domain/tax-compliance-settings.repository';
import { RefreshTaxSourcesUseCase } from '../../application/refresh-tax-sources.use-case';

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class TaxComplianceSourceMonitor implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | undefined;
  private initialTimer: NodeJS.Timeout | undefined;

  constructor(
    @Inject(TAX_COMPLIANCE_SETTINGS_REPOSITORY)
    private readonly settingsRepository: TaxComplianceSettingsRepository,
    private readonly refreshUseCase: RefreshTaxSourcesUseCase,
  ) {}

  onModuleInit(): void {
    this.initialTimer = setTimeout(() => void this.refreshIfEnabled(), 30_000);
    this.initialTimer.unref?.();
    this.timer = setInterval(() => void this.refreshIfEnabled(), REFRESH_INTERVAL_MS);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.initialTimer) clearTimeout(this.initialTimer);
    if (this.timer) clearInterval(this.timer);
  }

  private async refreshIfEnabled(): Promise<void> {
    try {
      const settings = await this.settingsRepository.find();
      if (settings?.enabled) await this.refreshUseCase.execute();
    } catch {
      // The source state records per-source errors; a scheduler failure must not stop the API.
    }
  }
}
