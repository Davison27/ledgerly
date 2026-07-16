import { Controller, Delete, Get, HttpCode, Param } from '@nestjs/common';
import { ListHintsUseCase } from '../../application/list-hints/list-hints.use-case';
import { DeleteHintUseCase } from '../../application/delete-hint/delete-hint.use-case';
import { ExtractionHintResponse } from './extraction-hint.response';

// Global (not scoped under /projects/:projectId): the learned memory is
// keyed by issuer tax id, which is meaningful across the whole tenant, not
// per-project.
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

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.deleteHintUseCase.execute(id);
  }
}
