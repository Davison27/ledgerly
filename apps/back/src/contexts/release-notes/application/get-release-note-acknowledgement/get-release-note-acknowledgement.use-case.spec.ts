import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';
import { ReleaseNoteAcknowledgement } from '../../domain/release-note-acknowledgement';
import { InMemoryReleaseNoteAcknowledgementRepository } from '../../testing/in-memory-release-note-acknowledgement.repository';
import { GetReleaseNoteAcknowledgementUseCase } from './get-release-note-acknowledgement.use-case';

describe('GetReleaseNoteAcknowledgementUseCase', () => {
  it('returns only the acknowledgement for the requested member and version', async () => {
    const acknowledgement = ReleaseNoteAcknowledgement.create({
      workspaceMemberId: 'member-1',
      releaseVersion: '1.1.0',
      acknowledgedAt: new Date('2026-09-22T10:00:00.000Z'),
    });
    const repository = new InMemoryReleaseNoteAcknowledgementRepository([acknowledgement]);
    const useCase = new GetReleaseNoteAcknowledgementUseCase(repository);

    await expect(useCase.execute({ workspaceMemberId: 'member-1', releaseVersion: '1.1.0' })).resolves.toBe(acknowledgement);
    await expect(useCase.execute({ workspaceMemberId: 'member-2', releaseVersion: '1.1.0' })).resolves.toBeNull();
    await expect(useCase.execute({ workspaceMemberId: 'member-1', releaseVersion: '1.2.0' })).resolves.toBeNull();
  });

  it('rejects a non-stable version before reading the repository', async () => {
    const repository = new InMemoryReleaseNoteAcknowledgementRepository();
    const useCase = new GetReleaseNoteAcknowledgementUseCase(repository);

    await expect(useCase.execute({ workspaceMemberId: 'member-1', releaseVersion: '1.1.0-rc.1' }))
      .rejects.toBeInstanceOf(InvalidValueException);
  });
});
