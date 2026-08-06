import { Inject, Injectable } from '@nestjs/common';
import {
  TAX_CLIENT_PROFILE_REPOSITORY,
  TaxClientProfileRepository,
} from '../domain/tax-client-profile.repository';
import { generateTaxDeadlines } from '../domain/tax-deadline-generator';
import { TaxDeadlineView } from '../domain/tax-deadline';
import { TAX_DEADLINE_REPOSITORY, TaxDeadlineRepository } from '../domain/tax-deadline.repository';
import { findTaxObligation } from '../domain/tax-obligation-catalog';
import {
  TAX_COMPLIANCE_SETTINGS_REPOSITORY,
  TaxComplianceSettingsRepository,
} from '../domain/tax-compliance-settings.repository';

export interface ListTaxDeadlinesQuery {
  from: string;
  to: string;
  projectId?: string;
}

@Injectable()
export class ListTaxDeadlinesUseCase {
  constructor(
    @Inject(TAX_COMPLIANCE_SETTINGS_REPOSITORY)
    private readonly settingsRepository: TaxComplianceSettingsRepository,
    @Inject(TAX_CLIENT_PROFILE_REPOSITORY)
    private readonly profileRepository: TaxClientProfileRepository,
    @Inject(TAX_DEADLINE_REPOSITORY)
    private readonly deadlineRepository: TaxDeadlineRepository,
  ) {}

  async execute(query: ListTaxDeadlinesQuery): Promise<TaxDeadlineView[]> {
    const settings = await this.settingsRepository.find();
    if (!settings?.enabled) return [];

    const profiles = (await this.profileRepository.findAll()).filter(
      (profile) => profile.enabled && (!query.projectId || profile.projectId === query.projectId),
    );

    const results: TaxDeadlineView[] = [];
    for (const profile of profiles) {
      const definitions = profile.obligationKeys
        .map((key) => findTaxObligation(key))
        .filter((definition) => definition !== undefined);

      for (const definition of definitions) {
        const deadlines = generateTaxDeadlines(profile, definition, query.from, query.to);
        for (const deadline of deadlines) {
          await this.deadlineRepository.upsert(deadline);
        }

        const views = await this.deadlineRepository.findByFilter({
          from: query.from,
          to: query.to,
          projectId: profile.projectId,
          obligationKeys: [definition.key],
        });
        results.push(...views);
      }
    }

    const unique = new Map(results.map((deadline) => [deadline.occurrenceKey, deadline]));
    return [...unique.values()].sort(
      (a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title),
    );
  }
}
