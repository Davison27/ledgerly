import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';
import { ReleaseNoteAcknowledgement, validateReleaseVersion } from './release-note-acknowledgement';

describe('ReleaseNoteAcknowledgement', () => {
  it.each(['0.0.0', '1.1.0', '10.22.300'])('accepts stable semantic version %s', (releaseVersion) => {
    validateReleaseVersion(releaseVersion);
  });

  it.each(['', '01.1.0', '1.01.0', '1.1.00', '1.1', '1.1.0-rc.1', '1.1.0+build.1', '1.1.0\n'])('rejects invalid semantic version %s', (releaseVersion) => {
    expect(() => validateReleaseVersion(releaseVersion)).toThrow(InvalidValueException);
  });

  it('creates an acknowledgement with its original timestamp', () => {
    const acknowledgedAt = new Date('2026-09-22T10:00:00.000Z');
    const acknowledgement = ReleaseNoteAcknowledgement.create({
      workspaceMemberId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      releaseVersion: '1.1.0',
      acknowledgedAt,
    });

    expect(acknowledgement.getWorkspaceMemberId()).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    expect(acknowledgement.getReleaseVersion()).toBe('1.1.0');
    expect(acknowledgement.getAcknowledgedAt()).toBe(acknowledgedAt);
  });

  it('rejects an invalid acknowledgement timestamp', () => {
    expect(() =>
      ReleaseNoteAcknowledgement.create({
        workspaceMemberId: 'member-1',
        releaseVersion: '1.1.0',
        acknowledgedAt: new Date(Number.NaN),
      }),
    ).toThrow(InvalidValueException);
  });
});
