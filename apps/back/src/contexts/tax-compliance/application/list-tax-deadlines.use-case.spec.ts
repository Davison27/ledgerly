import { ListTaxDeadlinesUseCase } from './list-tax-deadlines.use-case';
import type { TaxClientProfileRepository } from '../domain/tax-client-profile.repository';
import type { TaxComplianceSettingsRepository } from '../domain/tax-compliance-settings.repository';
import type { TaxDeadlineRepository } from '../domain/tax-deadline.repository';

describe('ListTaxDeadlinesUseCase', () => {
  it('filters project-linked deadlines before reading profiles or applying list limits', async () => {
    const findSettings = jest.fn();
    const findProfiles = jest.fn();
    const upsertDeadline = jest.fn();
    const findDeadlines = jest.fn();
    const settingsRepository: TaxComplianceSettingsRepository = {
      find: findSettings,
      save: jest.fn(),
    };
    const profileRepository: TaxClientProfileRepository = {
      findAll: findProfiles,
      findByProjectId: jest.fn(),
      save: jest.fn(),
    };
    const deadlineRepository: TaxDeadlineRepository = {
      upsert: upsertDeadline,
      findByFilter: findDeadlines,
    };
    const useCase = new ListTaxDeadlinesUseCase(
      settingsRepository,
      profileRepository,
      deadlineRepository,
    );

    const deadlines = await useCase.execute(
      { from: '2026-01-01', to: '2026-01-31' },
      { projects: false },
    );

    expect(deadlines).toEqual([]);
    expect(findSettings).not.toHaveBeenCalled();
    expect(findProfiles).not.toHaveBeenCalled();
    expect(upsertDeadline).not.toHaveBeenCalled();
    expect(findDeadlines).not.toHaveBeenCalled();
  });
});
