import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../../domain/company';
import { CompanyRepository } from '../../domain/company.repository';
import { CompanyMapper } from './company.mapper';
import { CompanyOrmEntity } from './company.orm-entity';

@Injectable()
export class TypeOrmCompanyRepository implements CompanyRepository {
  constructor(
    @InjectRepository(CompanyOrmEntity)
    private readonly repository: Repository<CompanyOrmEntity>,
  ) {}

  async find(): Promise<Company | null> {
    const orm = await this.repository.findOne({
      where: {},
      order: { id: 'ASC' },
    });

    if (!orm) {
      return null;
    }

    return CompanyMapper.toDomain(orm);
  }

  async save(company: Company): Promise<void> {
    const orm = CompanyMapper.toOrm(company);
    await this.repository.save(orm);
  }
}
