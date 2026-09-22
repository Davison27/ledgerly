import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';
import { Clock } from '../../../../shared/domain/clock.port';
import { InMemoryReleaseNoteAcknowledgementRepository } from '../../testing/in-memory-release-note-acknowledgement.repository';
import { AcknowledgeReleaseNoteUseCase } from './acknowledge-release-note.use-case';

class FixedClock implements Clock {
  constructor(private readonly value: Date) {}

  now(): Date {
    return this.value;
  }

  todayIso(): string {
    return this.value.toISOString().slice(0, 10);
  }
}

describe('AcknowledgeReleaseNoteUseCase', () => {
  it('preserves the first timestamp when the request is repeated or concurrent', async () => {
    const repository = new InMemoryReleaseNoteAcknowledgementRepository();
    const firstTime = new Date('2026-09-22T10:00:00.000Z');
    const useCase = new AcknowledgeReleaseNoteUseCase(repository, new FixedClock(firstTime));

    await Promise.all([
      useCase.execute({ workspaceMemberId: 'member-1', releaseVersion: '1.1.0' }),
      useCase.execute({ workspaceMemberId: 'member-1', releaseVersion: '1.1.0' }),
      useCase.execute({ workspaceMemberId: 'member-1', releaseVersion: '1.1.0' }),
    ]);

    expect(repository.values).toHaveLength(1);
    expect(repository.values[0].getAcknowledgedAt()).toBe(firstTime);
  });

  it('keeps acknowledgements isolated by member and release version', async () => {
    const repository = new InMemoryReleaseNoteAcknowledgementRepository();
    const useCase = new AcknowledgeReleaseNoteUseCase(
      repository,
      new FixedClock(new Date('2026-09-22T10:00:00.000Z')),
    );

    await useCase.execute({ workspaceMemberId: 'member-1', releaseVersion: '1.1.0' });
    await useCase.execute({ workspaceMemberId: 'member-2', releaseVersion: '1.1.0' });
    await useCase.execute({ workspaceMemberId: 'member-1', releaseVersion: '1.2.0' });

    expect(repository.values).toHaveLength(3);
  });

  it('rejects an invalid version before inserting', async () => {
    const repository = new InMemoryReleaseNoteAcknowledgementRepository();
    const useCase = new AcknowledgeReleaseNoteUseCase(
      repository,
      new FixedClock(new Date('2026-09-22T10:00:00.000Z')),
    );

    await expect(useCase.execute({ workspaceMemberId: 'member-1', releaseVersion: '1.1.0+build.1' }))
      .rejects.toBeInstanceOf(InvalidValueException);
    expect(repository.values).toHaveLength(0);
  });
});
