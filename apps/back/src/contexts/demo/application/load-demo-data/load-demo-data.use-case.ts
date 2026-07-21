import { Inject, Injectable } from '@nestjs/common';
import { Project } from '../../../projects/domain/project';
import { PROJECT_REPOSITORY, ProjectRepository } from '../../../projects/domain/project.repository';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../../documents/domain/document.repository';
import {
  STAFF_MEMBER_REPOSITORY,
  StaffMemberRepository,
} from '../../../staff/domain/staff-member.repository';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
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
  ) {}

  async execute(): Promise<LoadDemoDataResult> {
    const existingProjects = await this.projectRepository.findAllSummaries();

    if (existingProjects.length > 0) {
      // Idempotent no-op: demo data is only provisioned when there is
      // nothing else in the workspace yet.
      return { created: false, projectId: null, documentCount: 0, staffMemberCount: 0 };
    }

    const projectId = this.idGenerator.generate();
    const today = new Date();
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
      isDemo: true,
    });

    await this.projectRepository.save(project);

    // D4/U2.8: the staff members are created before the documents so their
    // ids exist to imput the demo payrolls to (D3 requires it).
    const staffMembers = buildDemoStaffMembers(() => this.idGenerator.generate());

    for (const staffMember of staffMembers) {
      await this.staffMemberRepository.save(staffMember);
    }

    const staffMemberIds = staffMembers.map((staffMember) => staffMember.id);
    const documents = buildDemoDocuments(projectId, () => this.idGenerator.generate(), staffMemberIds);

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
