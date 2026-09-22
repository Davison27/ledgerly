import { Repository } from 'typeorm';
import { ReleaseNoteAcknowledgement } from '../../domain/release-note-acknowledgement';
import { ReleaseNoteAcknowledgementOrmEntity } from './release-note-acknowledgement.orm-entity';
import { TypeOrmReleaseNoteAcknowledgementRepository } from './typeorm-release-note-acknowledgement.repository';

describe('TypeOrmReleaseNoteAcknowledgementRepository', () => {
  it('scopes reads by both member and version', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const repository = new TypeOrmReleaseNoteAcknowledgementRepository({ findOne } as unknown as Repository<ReleaseNoteAcknowledgementOrmEntity>);

    await expect(repository.findByMemberAndVersion('member-1', '1.1.0')).resolves.toBeNull();

    expect(findOne).toHaveBeenCalledWith({ where: { workspaceMemberId: 'member-1', releaseVersion: '1.1.0' } });
  });

  it('inserts idempotently without replacing the first timestamp', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    const orIgnore = jest.fn(() => ({ execute }));
    const values = jest.fn(() => ({ orIgnore }));
    const into = jest.fn(() => ({ values }));
    const insert = jest.fn(() => ({ into }));
    const createQueryBuilder = jest.fn(() => ({ insert }));
    const repository = new TypeOrmReleaseNoteAcknowledgementRepository({ createQueryBuilder } as unknown as Repository<ReleaseNoteAcknowledgementOrmEntity>);
    const acknowledgement = ReleaseNoteAcknowledgement.create({
      workspaceMemberId: 'member-1',
      releaseVersion: '1.1.0',
      acknowledgedAt: new Date('2026-09-22T10:00:00.000Z'),
    });

    await repository.insertIfAbsent(acknowledgement);

    expect(orIgnore).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      workspaceMemberId: 'member-1',
      releaseVersion: '1.1.0',
      acknowledgedAt: acknowledgement.getAcknowledgedAt(),
    }));
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
