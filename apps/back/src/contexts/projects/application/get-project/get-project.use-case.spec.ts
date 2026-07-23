import { GetProjectUseCase } from './get-project.use-case';
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
      documentCount: 0,
      pendingCount: 0,
      image: project.image,
      color: project.color,
    };
  }
}

describe('GetProjectUseCase', () => {
  it('returns the full project including the image', async () => {
    const repository = new InMemoryProjectRepository();
    const project = Project.create({
      id: 'project-1',
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
      image: 'data:image/png;base64,abc',
      color: null,
    });
    await repository.save(project);

    const useCase = new GetProjectUseCase(repository);
    const result = await useCase.execute('project-1');

    expect(result).toBeInstanceOf(Project);
    expect(result.image).toBe('data:image/png;base64,abc');
    expect(result.toPrimitives()).not.toHaveProperty('documentCount');
  });

  it('throws ProjectNotFoundException when the project does not exist', async () => {
    const repository = new InMemoryProjectRepository();
    const useCase = new GetProjectUseCase(repository);

    await expect(useCase.execute('missing-id')).rejects.toThrow(ProjectNotFoundException);
  });
});
