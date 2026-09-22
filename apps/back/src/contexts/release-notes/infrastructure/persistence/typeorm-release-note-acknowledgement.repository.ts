import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReleaseNoteAcknowledgement } from '../../domain/release-note-acknowledgement';
import { ReleaseNoteAcknowledgementRepository } from '../../domain/release-note-acknowledgement.repository';
import { ReleaseNoteAcknowledgementMapper } from './release-note-acknowledgement.mapper';
import { ReleaseNoteAcknowledgementOrmEntity } from './release-note-acknowledgement.orm-entity';

@Injectable()
export class TypeOrmReleaseNoteAcknowledgementRepository implements ReleaseNoteAcknowledgementRepository {
  constructor(
    @InjectRepository(ReleaseNoteAcknowledgementOrmEntity)
    private readonly repository: Repository<ReleaseNoteAcknowledgementOrmEntity>,
  ) {}

  async findByMemberAndVersion(
    workspaceMemberId: string,
    releaseVersion: string,
  ): Promise<ReleaseNoteAcknowledgement | null> {
    const orm = await this.repository.findOne({ where: { workspaceMemberId, releaseVersion } });
    return orm ? ReleaseNoteAcknowledgementMapper.toDomain(orm) : null;
  }

  async insertIfAbsent(acknowledgement: ReleaseNoteAcknowledgement): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .insert()
      .into(ReleaseNoteAcknowledgementOrmEntity)
      .values(ReleaseNoteAcknowledgementMapper.toOrm(acknowledgement))
      .orIgnore()
      .execute();
  }
}
