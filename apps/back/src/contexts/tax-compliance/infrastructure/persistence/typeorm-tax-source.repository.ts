import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { TaxSourceEvent } from '../../domain/tax-source-event';
import type { TaxSourceRepository } from '../../domain/tax-source.repository';
import type { TaxSourceStatePrimitives } from '../../domain/tax-source-state';
import { TaxSourceStateOrmEntity } from './tax-source-state.orm-entity';

function toPrimitives(orm: TaxSourceStateOrmEntity): TaxSourceStatePrimitives {
  return {
    sourceKey: orm.sourceKey,
    countryCode: orm.countryCode as TaxSourceStatePrimitives['countryCode'],
    label: orm.label,
    format: orm.format as TaxSourceStatePrimitives['format'],
    sourceUrl: orm.sourceUrl,
    feedUrl: orm.feedUrl,
    status: orm.status as TaxSourceStatePrimitives['status'],
    acceptedHash: orm.acceptedHash,
    acceptedEvents: [...(orm.acceptedEvents ?? [])] as TaxSourceEvent[],
    observedHash: orm.observedHash,
    observedEvents: [...(orm.observedEvents ?? [])] as TaxSourceEvent[],
    lastCheckedAt: orm.lastCheckedAt,
    lastSuccessfulAt: orm.lastSuccessfulAt,
    lastSourceModifiedAt: orm.lastSourceModifiedAt,
    etag: orm.etag,
    lastModified: orm.lastModified,
    lastError: orm.lastError,
    updatedAt: orm.updatedAt,
  };
}

@Injectable()
export class TypeOrmTaxSourceRepository implements TaxSourceRepository {
  constructor(
    @InjectRepository(TaxSourceStateOrmEntity)
    private readonly repository: Repository<TaxSourceStateOrmEntity>,
  ) {}

  async findAll(): Promise<TaxSourceStatePrimitives[]> {
    const orms = await this.repository.find({ order: { sourceKey: 'ASC' } });
    return orms.map(toPrimitives);
  }

  async findByKey(sourceKey: string): Promise<TaxSourceStatePrimitives | null> {
    const orm = await this.repository.findOne({ where: { sourceKey } });
    return orm ? toPrimitives(orm) : null;
  }

  async save(state: TaxSourceStatePrimitives): Promise<void> {
    const orm = new TaxSourceStateOrmEntity();
    orm.sourceKey = state.sourceKey;
    orm.countryCode = state.countryCode;
    orm.label = state.label;
    orm.format = state.format;
    orm.sourceUrl = state.sourceUrl;
    orm.feedUrl = state.feedUrl;
    orm.status = state.status;
    orm.acceptedHash = state.acceptedHash;
    orm.acceptedEvents = [...state.acceptedEvents];
    orm.observedHash = state.observedHash;
    orm.observedEvents = [...state.observedEvents];
    orm.lastCheckedAt = state.lastCheckedAt;
    orm.lastSuccessfulAt = state.lastSuccessfulAt;
    orm.lastSourceModifiedAt = state.lastSourceModifiedAt;
    orm.etag = state.etag;
    orm.lastModified = state.lastModified;
    orm.lastError = state.lastError;
    orm.updatedAt = state.updatedAt;
    await this.repository.save(orm);
  }
}
