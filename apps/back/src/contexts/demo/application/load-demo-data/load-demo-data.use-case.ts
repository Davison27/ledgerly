import { Inject, Injectable } from '@nestjs/common';
import { Project } from '../../../projects/domain/project';
import { PROJECT_REPOSITORY, ProjectRepository } from '../../../projects/domain/project.repository';
import { Document } from '../../../documents/domain/document';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../../documents/domain/document.repository';
import { StaffMember } from '../../../staff/domain/staff-member';
import {
  STAFF_MEMBER_REPOSITORY,
  StaffMemberRepository,
} from '../../../staff/domain/staff-member.repository';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';
import { buildDemoDocuments } from './demo-documents';
import { buildDemoStaffMembers } from './demo-staff-members';
import { LoadDemoDataResult } from './load-demo-data.result';

const DEMO_PROJECT_NAME = 'Proyecto de ejemplo';
const DEMO_PROJECT_CODE = 'DEMO-01';

@Injectable()
export class LoadDemoDataUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepository: DocumentRepository,
    @Inject(STAFF_MEMBER_REPOSITORY)
    private readonly staffMemberRepository: StaffMemberRepository,
    @Inject(ID_GENERATOR)
    private readonly idGenerator: IdGenerator,
    @Inject(CLOCK)
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<LoadDemoDataResult> {
    const existingProjects = await this.projectRepository.findAllSummaries();

    if (existingProjects.length > 0) {
      return { created: false, projectId: null, documentCount: 0, staffMemberCount: 0 };
    }

    const projectId = this.idGenerator.generate();
    const today = this.clock.now();
    const startDate = today.toISOString().slice(0, 10);
    const fiscalYear = String(today.getUTCFullYear());

    const project = Project.create({
      id: projectId,
      name: DEMO_PROJECT_NAME,
      code: DEMO_PROJECT_CODE,
      type: 'client',
      status: 'active',
      description: 'Proyecto de demostración con documentos de ejemplo para explorar Ledgerly.',
      clientCompany: 'Cliente Demo SL',
      clientTaxId: 'B00000000',
      contactName: 'Ana Demo',
      contactEmail: null,
      contactPhone: null,
      address: null,
      startDate,
      endDate: null,
      budget: 50000,
      currency: 'EUR',
      fiscalYear,
      manager: null,
      image: null,
      color: null,
      isDemo: true,
    });

    await this.projectRepository.save(project);

    const staffMemberSeeds = buildDemoStaffMembers(() => this.idGenerator.generate(), today);
    const staffMembers = staffMemberSeeds.map((seed) => StaffMember.create(seed));

    for (const staffMember of staffMembers) {
      await this.staffMemberRepository.save(staffMember);
    }

    const staffMemberIds = staffMembers.map((staffMember) => staffMember.id);
    const documentSeeds = buildDemoDocuments(
      projectId,
      () => this.idGenerator.generate(),
      staffMemberIds,
      today,
    );
    const documents = documentSeeds.map((seed) => Document.create(seed));

    for (const document of documents) {
      await this.documentRepository.save(document);
    }

    return {
      created: true,
      projectId,
      documentCount: documents.length,
      staffMemberCount: staffMembers.length,
    };
  }
}
