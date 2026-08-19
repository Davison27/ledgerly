import { Controller, Delete, Get, HttpCode, Param, Query } from '@nestjs/common';
import { RequiresAccess } from '../../../../shared/infrastructure/http/access/requires-access.decorator';
import { ListHintsUseCase } from '../../application/list-hints/list-hints.use-case';
import { DeleteHintUseCase } from '../../application/delete-hint/delete-hint.use-case';
import { ExtractionHintResponse } from './extraction-hint.response';
import { ListExtractionHintsQueryDto } from './dtos/list-extraction-hints.query.dto';
import { getOptionalPageRequest } from '../../../../shared/infrastructure/http/dtos/page.query.dto';
import { ExtractionHintPageResponse } from './extraction-hint-page.response';

@RequiresAccess('documents', 'view')
@Controller('extraction-hints')
export class ExtractionHintsController {
  constructor(
    private readonly listHintsUseCase: ListHintsUseCase,
    private readonly deleteHintUseCase: DeleteHintUseCase,
  ) {}

  @Get()
  async list(
    @Query() query: ListExtractionHintsQueryDto,
  ): Promise<ExtractionHintResponse[] | ExtractionHintPageResponse> {
    const pageRequest = getOptionalPageRequest(query);
    if (pageRequest) {
      return ExtractionHintPageResponse.fromPage(await this.listHintsUseCase.executePage(pageRequest));
    }

    const hints = await this.listHintsUseCase.execute();

    return hints.map((hint) => ExtractionHintResponse.fromDomain(hint));
  }

  @RequiresAccess('documents', 'edit')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.deleteHintUseCase.execute(id);
  }
}
