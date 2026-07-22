import { Controller, Get } from '@nestjs/common';
import { GetExtractionQualityUseCase } from '../../application/get-extraction-quality/get-extraction-quality.use-case';
import { ExtractionQualityResponse } from './extraction-quality.response';

@Controller('extraction-quality')
export class ExtractionQualityController {
  constructor(private readonly getExtractionQualityUseCase: GetExtractionQualityUseCase) {}

  @Get()
  async get(): Promise<ExtractionQualityResponse> {
    const report = await this.getExtractionQualityUseCase.execute();

    return ExtractionQualityResponse.fromDomain(report);
  }
}
