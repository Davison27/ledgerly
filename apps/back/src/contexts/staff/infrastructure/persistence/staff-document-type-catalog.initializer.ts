import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { StaffDocumentTypeOrmEntity } from './staff-document-type.orm-entity';

const SYSTEM_DOCUMENT_TYPES: Array<Pick<StaffDocumentTypeOrmEntity, 'id' | 'code' | 'name' | 'expires' | 'defaultValidityMonths' | 'isSystem'>> = [
  { id: '5dcb74bb-cf13-49de-8f95-e51f9cb6258f', code: 'dni', name: 'National ID', expires: true, defaultValidityMonths: 120, isSystem: true },
  { id: 'bf876c37-f80d-4b48-ae46-85e7b1dbf3b2', code: 'foto', name: 'Photo', expires: false, defaultValidityMonths: null, isSystem: true },
  { id: '080cdbfc-23d4-4d25-8f1f-048e9638c9f6', code: 'prl', name: 'Health and safety training', expires: true, defaultValidityMonths: 12, isSystem: true },
  { id: 'd2c6a2f1-5b7b-4a1d-9f34-7f4c8d6e2b90', code: 'art18', name: 'Article 18', expires: false, defaultValidityMonths: null, isSystem: true },
  { id: 'c321dc8f-0d3e-49d2-8b2e-e891ad0ac717', code: 'art19', name: 'Article 19', expires: true, defaultValidityMonths: 12, isSystem: true },
  { id: '9f55f7da-6644-4537-b053-d1889985113d', code: 'epis', name: 'PPE record', expires: true, defaultValidityMonths: 12, isSystem: true },
  { id: '0e61de47-097d-4779-a567-0dce90e0a90e', code: 'renuncia_reco', name: 'RECO waiver', expires: false, defaultValidityMonths: null, isSystem: true },
  { id: 'b3379502-212f-49e8-ae94-2dcaf6e77172', code: 'reta_recibo', name: 'RETA receipt', expires: false, defaultValidityMonths: null, isSystem: true },
  { id: '4197b65c-ec4f-4d68-bd2a-dc0d22c571b1', code: 'varios', name: 'Other', expires: false, defaultValidityMonths: null, isSystem: true },
];

@Injectable()
export class StaffDocumentTypeCatalogInitializer implements OnApplicationBootstrap {
  private readonly logger = new Logger(StaffDocumentTypeCatalogInitializer.name);

  constructor(
    @InjectRepository(StaffDocumentTypeOrmEntity)
    private readonly repository: Repository<StaffDocumentTypeOrmEntity>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const codes = SYSTEM_DOCUMENT_TYPES.map((type) => type.code);
    const existing = await this.repository.find({ where: { code: In(codes) } });
    const existingCodes = new Set(existing.map((type) => type.code));
    const missing = SYSTEM_DOCUMENT_TYPES.filter((type) => !existingCodes.has(type.code));

    if (missing.length === 0) return;

    await this.repository.insert(missing);
    this.logger.log(`Created ${missing.length} missing system staff document types`);
  }
}
