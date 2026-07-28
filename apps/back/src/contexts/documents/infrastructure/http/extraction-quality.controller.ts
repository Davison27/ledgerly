import { Controller, Get } from '@nestjs/common';
import { RequiresAccess } from '../../../../shared/infrastructure/http/access/requires-access.decorator';
import { GetExtractionQualityUseCase } from '../../application/get-extraction-quality/get-extraction-quality.use-case';
import { ExtractionQualityResponse } from './extraction-quality.response';

@RequiresAccess('documents', 'view')
@Controller('extraction-quality')
export class ExtractionQualityController {
  constructor(private readonly getExtractionQualityUseCase: GetExtractionQualityUseCase) {}

  @Get()
  async get(): Promise<ExtractionQualityResponse> {
    const report = await this.getExtractionQualityUseCase.execute();

    return ExtractionQualityResponse.fromDomain(report);
  }
}
