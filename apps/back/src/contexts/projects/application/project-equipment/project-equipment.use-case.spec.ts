import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';
import { Equipment } from '../../../equipment/domain/equipment';
import { EquipmentRepository } from '../../../equipment/domain/equipment.repository';
import { Project } from '../../domain/project';
import { ProjectRepository } from '../../domain/project.repository';
import {
  ProjectEquipmentRecord,
  ProjectEquipmentRepository,
  ProjectLeaseExpenseRow,
} from '../../domain/project-equipment.repository';
import { ProjectEquipmentUseCase } from './project-equipment.use-case';

class InMemoryProjectEquipmentRepository implements ProjectEquipmentRepository {
  readonly deleteCalls: Array<{ projectId: string; equipmentId: string }> = [];

  constructor(private records: ProjectEquipmentRecord[] = []) {}

  findByProjectId(projectId: string): Promise<ProjectEquipmentRecord[]> {
    return Promise.resolve(this.records.filter((record) => record.projectId === projectId));
  }

  save(input: Pick<ProjectEquipmentRecord, 'projectId' | 'equipmentId' | 'leaseExpense' | 'leaseExpenseDate'>): Promise<void> {
    this.records.push({
      ...input,
      name: 'Equipment',
      reference: null,
      category: null,
      image: null,
      leasingMonthlyFee: null,
    });
    return Promise.resolve();
  }

  delete(projectId: string, equipmentId: string): Promise<boolean> {
    this.deleteCalls.push({ projectId, equipmentId });
    const originalLength = this.records.length;
    this.records = this.records.filter(
      (record) => record.projectId !== projectId || record.equipmentId !== equipmentId,
    );
    return Promise.resolve(this.records.length !== originalLength);
  }

  deleteByProjectId(projectId: string): Promise<void> {
    this.records = this.records.filter((record) => record.projectId !== projectId);
    return Promise.resolve();
  }

  findAllLeaseExpenseRows(): Promise<ProjectLeaseExpenseRow[]> {
    return Promise.resolve([]);
  }

  snapshot(): ProjectEquipmentRecord[] {
    return [...this.records];
  }
}

class ExistingProjectRepository implements ProjectRepository {
  constructor(private readonly projectIds: Set<string>) {}

  findById(id: string): Promise<Project | null> {
    return Promise.resolve(this.projectIds.has(id) ? ({} as Project) : null);
  }

  findAllSummaries(): Promise<never[]> {
    return Promise.resolve([]);
  }

  findSummaryById(): Promise<null> {
    return Promise.resolve(null);
  }

  findByCode(): Promise<null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }

  findAllForDashboard(): Promise<never[]> {
    return Promise.resolve([]);
  }
}

class ExistingEquipmentRepository implements EquipmentRepository {
  findById(): Promise<Equipment | null> {
    return Promise.resolve({} as Equipment);
  }

  findAll(): Promise<never[]> {
    return Promise.resolve([]);
  }

  findByName(): Promise<null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }
}

const ASSOCIATION: ProjectEquipmentRecord = {
  projectId: 'project-1',
  equipmentId: 'equipment-1',
  name: 'Equipment',
  reference: null,
  category: null,
  image: null,
  leasingMonthlyFee: null,
  leaseExpense: null,
  leaseExpenseDate: null,
};

describe('ProjectEquipmentUseCase', () => {
  it('rejects an unknown or unassociated equipment without mutating project associations', async () => {
    const repository = new InMemoryProjectEquipmentRepository([ASSOCIATION]);
    const useCase = new ProjectEquipmentUseCase(
      repository,
      new ExistingProjectRepository(new Set(['project-1'])),
      new ExistingEquipmentRepository(),
    );

    await expect(useCase.remove('project-1', 'equipment-2')).rejects.toThrow(EntityNotFoundException);

    expect(repository.deleteCalls).toEqual([{ projectId: 'project-1', equipmentId: 'equipment-2' }]);
    expect(repository.snapshot()).toEqual([ASSOCIATION]);
  });

  it('removes an existing project-equipment association', async () => {
    const repository = new InMemoryProjectEquipmentRepository([ASSOCIATION]);
    const useCase = new ProjectEquipmentUseCase(
      repository,
      new ExistingProjectRepository(new Set(['project-1'])),
      new ExistingEquipmentRepository(),
    );

    await useCase.remove('project-1', 'equipment-1');

    expect(repository.snapshot()).toEqual([]);
  });
});
