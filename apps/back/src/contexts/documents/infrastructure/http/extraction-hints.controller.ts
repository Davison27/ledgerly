import { Controller, Delete, Get, HttpCode, Param } from '@nestjs/common';
import { RequiresAccess } from '../../../../shared/infrastructure/http/access/requires-access.decorator';
import { ListHintsUseCase } from '../../application/list-hints/list-hints.use-case';
import { DeleteHintUseCase } from '../../application/delete-hint/delete-hint.use-case';
import { ExtractionHintResponse } from './extraction-hint.response';

@RequiresAccess('documents', 'view')
@Controller('extraction-hints')
export class ExtractionHintsController {
  constructor(
    private readonly listHintsUseCase: ListHintsUseCase,
    private readonly deleteHintUseCase: DeleteHintUseCase,
  ) {}

  @Get()
  async list(): Promise<ExtractionHintResponse[]> {
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
