import { Global, Module } from '@nestjs/common';
import { ID_GENERATOR } from './domain/id-generator.port';
import { UuidGenerator } from './infrastructure/uuid-generator';

@Global()
@Module({
  providers: [{ provide: ID_GENERATOR, useClass: UuidGenerator }],
  exports: [ID_GENERATOR],
})
export class SharedModule {}
