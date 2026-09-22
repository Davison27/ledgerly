import { Controller, Get, Header, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { WorkspaceMember } from '../../../auth/domain/workspace-member';
import { AcknowledgeReleaseNoteUseCase } from '../../application/acknowledge-release-note/acknowledge-release-note.use-case';
import { GetReleaseNoteAcknowledgementUseCase } from '../../application/get-release-note-acknowledgement/get-release-note-acknowledgement.use-case';
import { Authenticated } from '../../../../shared/infrastructure/http/access/authenticated.decorator';
import { CurrentMember } from '../../../../shared/infrastructure/http/access/current-member.decorator';
import { ReleaseVersionParamDto } from './dtos/release-version.param.dto';
import { ReleaseNoteAcknowledgementResponse } from './release-note-acknowledgement.response';

@Authenticated()
@Controller('release-notes')
export class ReleaseNotesController {
  constructor(
    private readonly getAcknowledgementUseCase: GetReleaseNoteAcknowledgementUseCase,
    private readonly acknowledgeUseCase: AcknowledgeReleaseNoteUseCase,
  ) {}

  @Get(':version/acknowledgement')
  @Header('Cache-Control', 'private, no-store')
  async getAcknowledgement(
    @Param('version') version: string,
    @CurrentMember() member: WorkspaceMember,
  ): Promise<ReleaseNoteAcknowledgementResponse> {
    const { version: releaseVersion } = ReleaseVersionParamDto.fromRouteValue(version);
    const acknowledgement = await this.getAcknowledgementUseCase.execute({
      workspaceMemberId: member.getId(),
      releaseVersion,
    });

    return ReleaseNoteAcknowledgementResponse.fromAcknowledgement(acknowledgement);
  }

  @Post(':version/acknowledgement')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Header('Cache-Control', 'private, no-store')
  async acknowledge(
    @Param('version') version: string,
    @CurrentMember() member: WorkspaceMember,
  ): Promise<void> {
    const { version: releaseVersion } = ReleaseVersionParamDto.fromRouteValue(version);
    await this.acknowledgeUseCase.execute({
      workspaceMemberId: member.getId(),
      releaseVersion,
    });
  }
}
