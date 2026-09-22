import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';

export interface ReleaseNoteAcknowledgementProps {
  workspaceMemberId: string;
  releaseVersion: string;
  acknowledgedAt: Date;
}

export const STABLE_RELEASE_VERSION_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;

export function validateReleaseVersion(releaseVersion: string): void {
  const match = STABLE_RELEASE_VERSION_PATTERN.exec(releaseVersion);
  if (match?.[0] !== releaseVersion) {
    throw new InvalidValueException('version must be a stable semantic version');
  }
}

export class ReleaseNoteAcknowledgement {
  private constructor(private readonly props: ReleaseNoteAcknowledgementProps) {}

  static create(props: ReleaseNoteAcknowledgementProps): ReleaseNoteAcknowledgement {
    validateReleaseVersion(props.releaseVersion);
    if (!Number.isFinite(props.acknowledgedAt.getTime())) {
      throw new InvalidValueException('acknowledgedAt must be a valid timestamp');
    }

    return new ReleaseNoteAcknowledgement(props);
  }

  getWorkspaceMemberId(): string {
    return this.props.workspaceMemberId;
  }

  getReleaseVersion(): string {
    return this.props.releaseVersion;
  }

  getAcknowledgedAt(): Date {
    return this.props.acknowledgedAt;
  }
}
