import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ID_GENERATOR } from './domain/id-generator.port';
import { UuidGenerator } from './infrastructure/uuid-generator';
import { CLOCK } from './domain/clock.port';
import { SystemClock } from './infrastructure/system-clock';
import { DOMAIN_EVENT_PUBLISHER } from './domain/domain-event-publisher.port';
import { InProcessDomainEventPublisher } from './infrastructure/in-process-domain-event-publisher';
import { UploadCapacityGate, UploadCapacityInterceptor } from './infrastructure/http/upload-capacity.interceptor';
import { STORED_FILE_CIPHER } from './domain/stored-file-cipher.port';
import { createStoredFileCipher } from './infrastructure/crypto/stored-file-cipher';
import { parseStoredFileKeyring } from './infrastructure/crypto/stored-file-keyring';
import { MALWARE_SCANNER } from './domain/malware-scanner.port';
import { createClamAvMalwareScanner } from './infrastructure/malware/clamav-malware-scanner';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    { provide: ID_GENERATOR, useClass: UuidGenerator },
    { provide: CLOCK, useClass: SystemClock },
    { provide: DOMAIN_EVENT_PUBLISHER, useClass: InProcessDomainEventPublisher },
    UploadCapacityGate,
    UploadCapacityInterceptor,
    {
      provide: MALWARE_SCANNER,
      useFactory: (configService: ConfigService) =>
        createClamAvMalwareScanner({
          host: configService.get<string>('CLAMAV_HOST', 'clamav'),
          port: configService.get<number>('CLAMAV_PORT', 3310),
          timeoutMs: configService.get<number>('CLAMAV_TIMEOUT_MS', 30000),
        }),
      inject: [ConfigService],
    },
    {
      provide: STORED_FILE_CIPHER,
      useFactory: (configService: ConfigService) =>
        createStoredFileCipher(
          parseStoredFileKeyring({
            activeVersion: configService.getOrThrow<string>('STORED_FILE_ACTIVE_KEY_VERSION'),
            keys: configService.getOrThrow<string>('STORED_FILE_KEYS'),
            environment: configService.getOrThrow<string>('NODE_ENV'),
          }),
        ),
      inject: [ConfigService],
    },
  ],
  exports: [
    ID_GENERATOR,
    CLOCK,
    DOMAIN_EVENT_PUBLISHER,
    UploadCapacityGate,
    UploadCapacityInterceptor,
    MALWARE_SCANNER,
    STORED_FILE_CIPHER,
  ],
})
export class SharedModule {}
