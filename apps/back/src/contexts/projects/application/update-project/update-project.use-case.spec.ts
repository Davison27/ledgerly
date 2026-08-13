import { UpdateProjectUseCase } from './update-project.use-case';
import { ProjectDashboardRow, ProjectRepository } from '../../domain/project.repository';
import { Project } from '../../domain/project';
import { ProjectSummary } from '../../domain/project-summary';
import { ProjectNotFoundException } from '../../domain/errors/project-not-found.exception';

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

function buildProject(overrides: { id?: string; image?: string | null } = {}): Project {
  return Project.create({
    id: overrides.id ?? 'project-1',
    name: 'Acme Project',
    code: 'ACME-001',
    type: 'construction',
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
    image: overrides.image ?? null,
    color: null,
  });
}

describe('UpdateProjectUseCase', () => {
  it('updates the project image', async () => {
    const repository = new InMemoryProjectRepository();
    await repository.save(buildProject());
    const useCase = new UpdateProjectUseCase(repository);

    const updated = await useCase.execute({
      id: 'project-1',
      image: 'data:image/png;base64,def',
    });

    expect(updated.image).toBe('data:image/png;base64,def');
    const stored = await repository.findById('project-1');
    expect(stored?.image).toBe('data:image/png;base64,def');
  });

  it('clears the image when explicitly set to null', async () => {
    const repository = new InMemoryProjectRepository();
    await repository.save(buildProject({ image: 'data:image/png;base64,abc' }));
    const useCase = new UpdateProjectUseCase(repository);

    const updated = await useCase.execute({ id: 'project-1', image: null });

    expect(updated.image).toBeNull();
  });

  it('leaves the image untouched when not provided', async () => {
    const repository = new InMemoryProjectRepository();
    await repository.save(buildProject({ image: 'data:image/png;base64,abc' }));
    const useCase = new UpdateProjectUseCase(repository);

    const updated = await useCase.execute({ id: 'project-1', name: 'Renamed' });

    expect(updated.image).toBe('data:image/png;base64,abc');
  });

  it('throws ProjectNotFoundException when the project does not exist', async () => {
    const repository = new InMemoryProjectRepository();
    const useCase = new UpdateProjectUseCase(repository);

    await expect(useCase.execute({ id: 'missing-id', image: null })).rejects.toThrow(
      ProjectNotFoundException,
    );
  });

  it('changes the project color', async () => {
    const repository = new InMemoryProjectRepository();
    await repository.save(buildProject());
    const useCase = new UpdateProjectUseCase(repository);

    const updated = await useCase.execute({ id: 'project-1', color: 'terracotta' });

    expect(updated.color).toBe('terracotta');
    const stored = await repository.findById('project-1');
    expect(stored?.color).toBe('terracotta');
  });
});
