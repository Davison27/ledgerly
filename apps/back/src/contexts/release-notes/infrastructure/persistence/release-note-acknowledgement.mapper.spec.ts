import { ReleaseNoteAcknowledgement } from '../../domain/release-note-acknowledgement';
import { ReleaseNoteAcknowledgementMapper } from './release-note-acknowledgement.mapper';

describe('ReleaseNoteAcknowledgementMapper', () => {
  it('maps the complete persistence record in both directions', () => {
    const acknowledgedAt = new Date('2026-09-22T10:00:00.000Z');
    const acknowledgement = ReleaseNoteAcknowledgement.create({
      workspaceMemberId: 'member-1',
      releaseVersion: '1.1.0',
      acknowledgedAt,
    });

    const orm = ReleaseNoteAcknowledgementMapper.toOrm(acknowledgement);
    const mapped = ReleaseNoteAcknowledgementMapper.toDomain(orm);

    expect(mapped.getWorkspaceMemberId()).toBe('member-1');
    expect(mapped.getReleaseVersion()).toBe('1.1.0');
    expect(mapped.getAcknowledgedAt()).toBe(acknowledgedAt);
  });
});
