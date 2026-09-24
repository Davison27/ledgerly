import { UpdateProjectUseCase } from './update-project.use-case';
import { ProjectDashboardRow, ProjectRepository } from '../../domain/project.repository';
import { Project } from '../../domain/project';
import { ProjectSummary } from '../../domain/project-summary';
import { ProjectNotFoundException } from '../../domain/errors/project-not-found.exception';
import { ProjectClientLifecycleCoordinator } from '../../domain/project-client-lifecycle-coordinator.port';
import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';

const image = `data:image/png;base64,${Buffer.from('89504e470d0a1a0a00000000', 'hex').toString('base64')}`;

class InMemoryProjectRepository implements ProjectRepository {
  private projects: Project[] = [];

  findAllSummaries(): Promise<ProjectSummary[]> {
    return Promise.resolve(this.projects.map((project) => this.toSummary(project)));
  }

  findSummaryById(id: string): Promise<ProjectSummary | null> {
    const project = this.projects.find((existing) => existing.id === id) ?? null;
    return Promise.resolve(project !== null ? this.toSummary(project) : null);
  }

  findById(id: string): Promise<Project | null> {
    return Promise.resolve(this.projects.find((existing) => existing.id === id) ?? null);
  }

  findByCode(code: string): Promise<Project | null> {
    return Promise.resolve(this.projects.find((existing) => existing.code === code) ?? null);
  }

  save(project: Project): Promise<void> {
    const index = this.projects.findIndex((existing) => existing.id === project.id);

    if (index === -1) {
      this.projects.push(project);
    } else {
      this.projects[index] = project;
    }

    return Promise.resolve();
  }

  archive(): Promise<void> {
    return Promise.resolve();
  }

  findAllForDashboard(): Promise<ProjectDashboardRow[]> {
    return Promise.resolve(
      this.projects.map((project) => ({
        id: project.id,
        name: project.name,
        budget: project.budget,
        currency: project.currency,
      })),
    );
  }

  delete(id: string): Promise<void> {
    this.projects = this.projects.filter((project) => project.id !== id);
    return Promise.resolve();
  }

  private toSummary(project: Project): ProjectSummary {
    return {
      id: project.id,
      name: project.name,
      code: project.code,
      currency: project.currency,
      financials: [],
      documentCount: 0,
      pendingCount: 0,
      image: project.image,
      color: project.color,
    };
  }
}

class InMemoryProjectClientLifecycleCoordinator implements ProjectClientLifecycleCoordinator {
  saveCalls = 0;
  lastChecklistTemplateId: string | undefined;

  constructor(private readonly repository: InMemoryProjectRepository) {}

  saveProjectForActiveClient(project: Project, checklistTemplateId?: string): Promise<void> {
    this.saveCalls += 1;
    this.lastChecklistTemplateId = checklistTemplateId;
    return this.repository.save(project);
  }

  deleteOrArchiveClient(): Promise<'deleted' | 'archived'> {
    return Promise.resolve('deleted');
  }
}

function buildProject(overrides: { id?: string; image?: string | null } = {}): Project {
  return Project.create({
    id: overrides.id ?? 'project-1',
    name: 'Acme Project',
    code: 'ACME-001',
    type: 'construction',
    status: 'active',
    description: null,
    clientId: 'client-1',
    address: null,
    startDate: null,
    endDate: null,
    budget: null,
    currency: 'EUR',
    manager: null,
    image: overrides.image ?? null,
    color: null,
  });
}

describe('UpdateProjectUseCase', () => {
  it('updates the project image', async () => {
    const repository = new InMemoryProjectRepository();
    await repository.save(buildProject());
    const useCase = new UpdateProjectUseCase(
      repository,
      new InMemoryProjectClientLifecycleCoordinator(repository),
    );

    const updated = await useCase.execute({
      id: 'project-1',
      image,
    });

    expect(updated.image).toBe(image);
    const stored = await repository.findById('project-1');
    expect(stored?.image).toBe(image);
  });

  it('clears the image when explicitly set to null', async () => {
    const repository = new InMemoryProjectRepository();
    await repository.save(buildProject({ image }));
    const useCase = new UpdateProjectUseCase(
      repository,
      new InMemoryProjectClientLifecycleCoordinator(repository),
    );

    const updated = await useCase.execute({ id: 'project-1', image: null });

    expect(updated.image).toBeNull();
  });

  it('leaves the image untouched when not provided', async () => {
    const repository = new InMemoryProjectRepository();
    await repository.save(buildProject({ image }));
    const useCase = new UpdateProjectUseCase(
      repository,
      new InMemoryProjectClientLifecycleCoordinator(repository),
    );

    const updated = await useCase.execute({ id: 'project-1', name: 'Renamed' });

    expect(updated.image).toBe(image);
  });

  it('throws ProjectNotFoundException when the project does not exist', async () => {
    const repository = new InMemoryProjectRepository();
    const useCase = new UpdateProjectUseCase(
      repository,
      new InMemoryProjectClientLifecycleCoordinator(repository),
    );

    await expect(useCase.execute({ id: 'missing-id', image: null })).rejects.toThrow(
      ProjectNotFoundException,
    );
  });

  it('changes the project color', async () => {
    const repository = new InMemoryProjectRepository();
    await repository.save(buildProject());
    const useCase = new UpdateProjectUseCase(
      repository,
      new InMemoryProjectClientLifecycleCoordinator(repository),
    );

    const updated = await useCase.execute({ id: 'project-1', color: 'terracotta' });

    expect(updated.color).toBe('terracotta');
    const stored = await repository.findById('project-1');
    expect(stored?.color).toBe('terracotta');
  });

  it('preserves the current parent when reassignment is omitted or unchanged', async () => {
    const repository = new InMemoryProjectRepository();
    await repository.save(buildProject());
    const coordinator = new InMemoryProjectClientLifecycleCoordinator(repository);
    const useCase = new UpdateProjectUseCase(repository, coordinator);

    await useCase.execute({ id: 'project-1', name: 'Renamed' });
    await useCase.execute({ id: 'project-1', clientId: 'client-1' });

    expect(coordinator.saveCalls).toBe(0);
    expect((await repository.findById('project-1'))?.clientId).toBe('client-1');
  });

  it('uses the lifecycle coordinator for an actual reassignment', async () => {
    const repository = new InMemoryProjectRepository();
    await repository.save(buildProject());
    const coordinator = new InMemoryProjectClientLifecycleCoordinator(repository);
    const useCase = new UpdateProjectUseCase(repository, coordinator);

    await useCase.execute({ id: 'project-1', clientId: 'client-2' });

    expect(coordinator.saveCalls).toBe(1);
    expect((await repository.findById('project-1'))?.clientId).toBe('client-2');
  });

  it('rejects an explicit null parent before changing the project', async () => {
    const repository = new InMemoryProjectRepository();
    await repository.save(buildProject());
    const coordinator = new InMemoryProjectClientLifecycleCoordinator(repository);
    const useCase = new UpdateProjectUseCase(repository, coordinator);

    await expect(useCase.execute({ id: 'project-1', clientId: null })).rejects.toBeInstanceOf(
      InvalidValueException,
    );
    expect((await repository.findById('project-1'))?.clientId).toBe('client-1');
    expect(coordinator.saveCalls).toBe(0);
  });

  it('uses the lifecycle transaction when planning is first enabled with a template', async () => {
    const repository = new InMemoryProjectRepository();
    await repository.save(buildProject());
    const coordinator = new InMemoryProjectClientLifecycleCoordinator(repository);
    const useCase = new UpdateProjectUseCase(repository, coordinator);
    const checklistTemplateId = 'template-1';

    const project = await useCase.execute({
      id: 'project-1',
      planningEnabled: true,
      checklistTemplateId,
    });

    expect(project.planningEnabled).toBe(true);
    expect(coordinator.saveCalls).toBe(1);
    expect(coordinator.lastChecklistTemplateId).toBe(checklistTemplateId);
  });

  it('keeps checklist assignment out of settings updates without planning enabled', async () => {
    const repository = new InMemoryProjectRepository();
    await repository.save(buildProject());
    const coordinator = new InMemoryProjectClientLifecycleCoordinator(repository);
    const useCase = new UpdateProjectUseCase(repository, coordinator);

    await expect(useCase.execute({ id: 'project-1', checklistTemplateId: 'template-1' })).rejects.toBeInstanceOf(
      InvalidValueException,
    );
    expect(coordinator.saveCalls).toBe(0);
    expect((await repository.findById('project-1'))?.planningEnabled).toBe(false);
  });
});
