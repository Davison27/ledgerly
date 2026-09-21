import { Project } from '../../domain/project';
import { ProjectNotFoundException } from '../../domain/errors/project-not-found.exception';
import { ProjectRepository } from '../../domain/project.repository';
import { PhysicalDocumentReferenceCounter } from '../../domain/physical-document-reference-counter.port';
import { DeleteProjectUseCase } from './delete-project.use-case';

class InMemoryProjectRepository implements ProjectRepository {
  private projects: Project[];
  readonly deletedIds: string[] = [];
  readonly archivedIds: string[] = [];

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

  archive(id: string): Promise<void> {
    this.archivedIds.push(id);
    return Promise.resolve();
  }

  findAllForDashboard(): Promise<never[]> {
    return Promise.resolve([]);
  }
}

class FakeProjectPhysicalDocumentReferenceCounter implements PhysicalDocumentReferenceCounter {
  constructor(private readonly references: number) {}

  countPhysicalDocumentReferences(): Promise<number> {
    return Promise.resolve(this.references);
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
    clientId: null,
    address: null,
    startDate: null,
    endDate: null,
    budget: null,
    currency: 'EUR',
    manager: null,
    image: null,
    color: null,
  });
}

describe('DeleteProjectUseCase', () => {
  it('rejects an unknown project before deleting its associations', async () => {
    const projects = new InMemoryProjectRepository();
    const useCase = new DeleteProjectUseCase(projects, new FakeProjectPhysicalDocumentReferenceCounter(0));

    await expect(useCase.execute('missing-project')).rejects.toThrow(ProjectNotFoundException);

    expect(projects.deletedIds).toEqual([]);
  });

  it('deletes an unreferenced project', async () => {
    const projects = new InMemoryProjectRepository([project()]);
    const useCase = new DeleteProjectUseCase(projects, new FakeProjectPhysicalDocumentReferenceCounter(0));

    await expect(useCase.execute('project-1')).resolves.toBe('deleted');

    expect(projects.deletedIds).toEqual(['project-1']);
  });

  it('archives a project with document references', async () => {
    const projects = new InMemoryProjectRepository([project()]);
    const useCase = new DeleteProjectUseCase(projects, new FakeProjectPhysicalDocumentReferenceCounter(1));

    await expect(useCase.execute('project-1')).resolves.toBe('archived');

    expect(projects.archivedIds).toEqual(['project-1']);
    expect(projects.deletedIds).toEqual([]);
  });
});
