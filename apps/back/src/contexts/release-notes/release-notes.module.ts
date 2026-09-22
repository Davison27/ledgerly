import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcknowledgeReleaseNoteUseCase } from './application/acknowledge-release-note/acknowledge-release-note.use-case';
import { GetReleaseNoteAcknowledgementUseCase } from './application/get-release-note-acknowledgement/get-release-note-acknowledgement.use-case';
import { RELEASE_NOTE_ACKNOWLEDGEMENT_REPOSITORY } from './domain/release-note-acknowledgement.repository';
import { ReleaseNotesController } from './infrastructure/http/release-notes.controller';
import { ReleaseNoteAcknowledgementOrmEntity } from './infrastructure/persistence/release-note-acknowledgement.orm-entity';
import { TypeOrmReleaseNoteAcknowledgementRepository } from './infrastructure/persistence/typeorm-release-note-acknowledgement.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ReleaseNoteAcknowledgementOrmEntity])],
  controllers: [ReleaseNotesController],
  providers: [
    GetReleaseNoteAcknowledgementUseCase,
    AcknowledgeReleaseNoteUseCase,
    {
      provide: RELEASE_NOTE_ACKNOWLEDGEMENT_REPOSITORY,
      useClass: TypeOrmReleaseNoteAcknowledgementRepository,
    },
  ],
})
export class ReleaseNotesModule {}
