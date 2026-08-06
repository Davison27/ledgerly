import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { findTaxSource } from '../domain/tax-source-catalog';
import { TAX_SOURCE_REPOSITORY, TaxSourceRepository } from '../domain/tax-source.repository';
import { TaxSourceStateView } from '../domain/tax-source-state';
import { toTaxSourceStateView } from './list-tax-source-states.use-case';

@Injectable()
export class ReviewTaxSourceUseCase {
  constructor(
    @Inject(TAX_SOURCE_REPOSITORY)
    private readonly repository: TaxSourceRepository,
  ) {}

  async execute(sourceKey: string): Promise<TaxSourceStateView> {
    const source = findTaxSource(sourceKey);
    if (!source) throw new NotFoundException('Tax source not found');

    const state = await this.repository.findByKey(sourceKey);
    if (!state) throw new NotFoundException('Tax source has not been checked yet');
    if (state.status !== 'changed' || !state.observedHash) {
      throw new BadRequestException('Tax source has no pending changes');
    }

    const reviewedAt = new Date();
    const next = {
      ...state,
      status: 'current' as const,
      acceptedHash: state.observedHash,
      acceptedEvents: state.observedEvents,
      updatedAt: reviewedAt,
    };
    await this.repository.save(next);
    return toTaxSourceStateView(next);
  }
}
