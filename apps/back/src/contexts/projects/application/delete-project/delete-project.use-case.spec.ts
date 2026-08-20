import { Project } from '../../domain/project';
import { ProjectNotFoundException } from '../../domain/errors/project-not-found.exception';
import { ProjectRepository } from '../../domain/project.repository';
import {
  ProjectLeaseExpenseRow,
  ProjectEquipmentRecord,
  ProjectEquipmentRepository,
} from '../../domain/project-equipment.repository';
import { DeleteProjectUseCase } from './delete-project.use-case';

class InMemoryProjectRepository implements ProjectRepository {
  private projects: Project[];
  readonly deletedIds: string[] = [];

  constructor(projects: Project[] = []) {
    this.projects = projects;
  }

  findAllSummaries(): Promise<never[]> {
    return Promise.resolve([]);
  }

  findSummaryById(): Promise<null> {
    return Promise.resolve(null);
  }

  findById(id: string): Promise<Project | null> {
    return Promise.resolve(this.projects.find((project) => project.id === id) ?? null);
  }

  findByCode(): Promise<null> {
    return Promise.resolve(null);
  }

  save(project: Project): Promise<void> {
    this.projects.push(project);
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.deletedIds.push(id);
    this.projects = this.projects.filter((project) => project.id !== id);
    return Promise.resolve();
  }

  findAllForDashboard(): Promise<never[]> {
    return Promise.resolve([]);
  }
}

class InMemoryProjectEquipmentRepository implements ProjectEquipmentRepository {
  readonly deletedProjectIds: string[] = [];

  findByProjectId(): Promise<ProjectEquipmentRecord[]> {
    return Promise.resolve([]);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  delete(): Promise<boolean> {
    return Promise.resolve(false);
  }

  deleteByProjectId(projectId: string): Promise<void> {
    this.deletedProjectIds.push(projectId);
    return Promise.resolve();
  }

  findAllLeaseExpenseRows(): Promise<ProjectLeaseExpenseRow[]> {
    return Promise.resolve([]);
  }
}

function project(): Project {
  return Project.create({
    id: 'project-1',
    name: 'Project',
    code: 'PROJECT-1',
    type: 'client',
    status: 'active',
    description: null,
    clientCompany: null,
    clientTaxId: null,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    address: null,
    startDate: null,
    endDate: null,
    budget: null,
    currency: 'EUR',
    fiscalYear: null,
    manager: null,
    image: null,
    color: null,
  });
}

describe('DeleteProjectUseCase', () => {
  it('rejects an unknown project before deleting its associations', async () => {
    const projects = new InMemoryProjectRepository();
    const projectEquipment = new InMemoryProjectEquipmentRepository();
    const useCase = new DeleteProjectUseCase(projects, projectEquipment);

    await expect(useCase.execute('missing-project')).rejects.toThrow(ProjectNotFoundException);

    expect(projectEquipment.deletedProjectIds).toEqual([]);
    expect(projects.deletedIds).toEqual([]);
  });

  it('deletes an existing project and its associations', async () => {
    const projects = new InMemoryProjectRepository([project()]);
    const projectEquipment = new InMemoryProjectEquipmentRepository();
    const useCase = new DeleteProjectUseCase(projects, projectEquipment);

    await useCase.execute('project-1');

    expect(projectEquipment.deletedProjectIds).toEqual(['project-1']);
    expect(projects.deletedIds).toEqual(['project-1']);
  });
});
