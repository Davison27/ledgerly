import { validateReleaseVersion } from '../../../domain/release-note-acknowledgement';

export class ReleaseVersionParamDto {
  private constructor(readonly version: string) {}

  static fromRouteValue(version: string): ReleaseVersionParamDto {
    validateReleaseVersion(version);
    return new ReleaseVersionParamDto(version);
  }
}
