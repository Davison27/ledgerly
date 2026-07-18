import { Controller, HttpCode, Post } from '@nestjs/common';
import { LoadDemoDataUseCase } from '../../application/load-demo-data/load-demo-data.use-case';
import { LoadDemoDataResponse } from './load-demo-data.response';

@Controller('demo')
export class DemoController {
  constructor(private readonly loadDemoDataUseCase: LoadDemoDataUseCase) {}

  @Post()
  @HttpCode(200)
  async load(): Promise<LoadDemoDataResponse> {
    const result = await this.loadDemoDataUseCase.execute();

    return LoadDemoDataResponse.fromResult(result);
  }
}
