import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { getListLimit, ListLimitExceededException } from '../../../../shared/infrastructure/list-limit';
import { Client } from '../../domain/client';
import { ClientRepository } from '../../domain/client.repository';
import { ClientMapper } from './client.mapper';
import { ClientOrmEntity } from './client.orm-entity';
import { ClientTaxIdAlreadyExistsException } from '../../domain/errors/client-tax-id-already-exists.exception';
import { normalizeTaxId } from '../../../../shared/domain/tax-id';

@Injectable()
export class TypeOrmClientRepository implements ClientRepository {
  private readonly mapper = new ClientMapper();

  constructor(
    @InjectRepository(ClientOrmEntity)
    private readonly repository: Repository<ClientOrmEntity>,
  ) {}

  async findAll(): Promise<Client[]> {
    const limit = getListLimit('MAX_LIST_ITEMS', 500);
    const rows = await this.repository.find({ order: { name: 'ASC' }, take: limit + 1 });

    if (rows.length > limit) throw new ListLimitExceededException(limit, 'Clients');

    return rows.map((row) => this.mapper.toDomain(row));
  }

  async findById(id: string): Promise<Client | null> {
    const orm = await this.repository.findOne({ where: { id } });

    return orm !== null ? this.mapper.toDomain(orm) : null;
  }

  async findByTaxId(taxId: string): Promise<Client | null> {
    const normalizedTaxId = normalizeTaxId(taxId);
    if (normalizedTaxId === null) return null;

    const orm = await this.repository.findOne({ where: { taxId: normalizedTaxId } });

    return orm !== null ? this.mapper.toDomain(orm) : null;
  }

  async save(client: Client): Promise<void> {
    try {
      await this.repository.save(this.mapper.toOrm(client));
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as QueryFailedError & { driverError?: { code?: string; constraint?: string } }).driverError?.code ===
          '23505' &&
        (error as QueryFailedError & { driverError?: { code?: string; constraint?: string } }).driverError?.constraint ===
          'UQ_clients_tax_id'
      ) {
        throw new ClientTaxIdAlreadyExistsException(client.taxId ?? '');
      }

      throw error;
    }
  }

  async archive(id: string): Promise<void> {
    await this.repository.update(id, { archivedAt: () => 'CURRENT_TIMESTAMP' });
  }

  async unarchive(id: string): Promise<void> {
    await this.repository.update(id, { archivedAt: null });
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
