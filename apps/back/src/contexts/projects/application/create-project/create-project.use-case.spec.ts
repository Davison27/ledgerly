import { CreateProjectUseCase } from './create-project.use-case';
import { ProjectDashboardRow, ProjectRepository } from '../../domain/project.repository';
import { Project } from '../../domain/project';
import { ProjectSummary } from '../../domain/project-summary';
import { DemoProjectPurger } from '../../domain/demo-project-purger.port';
import { IdGenerator } from '../../../../shared/domain/id-generator.port';

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

  delete(id: string): Promise<void> {
    this.projects = this.projects.filter((project) => project.id !== id);
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

class SequentialIdGenerator implements IdGenerator {
  private nextId = 1;

  generate(): string {
    return `generated-id-${this.nextId++}`;
  }
}

class NoopDemoProjectPurger implements DemoProjectPurger {
  public callCount = 0;

  purgeDemoProjects(): Promise<void> {
    this.callCount++;
    return Promise.resolve();
  }
}

describe('CreateProjectUseCase', () => {
  it('creates a project with an image and persists it', async () => {
    const repository = new InMemoryProjectRepository();
    const useCase = new CreateProjectUseCase(
      repository,
      new SequentialIdGenerator(),
      new NoopDemoProjectPurger(),
    );

    const project = await useCase.execute({
      name: 'Acme Project',
      code: 'ACME-001',
      type: 'construction',
      image: 'data:image/png;base64,abc',
    });

    expect(project.image).toBe('data:image/png;base64,abc');

    const stored = await repository.findById(project.id);
    expect(stored?.image).toBe('data:image/png;base64,abc');
  });

  it('defaults image to null when not provided', async () => {
    const repository = new InMemoryProjectRepository();
    const useCase = new CreateProjectUseCase(
      repository,
      new SequentialIdGenerator(),
      new NoopDemoProjectPurger(),
    );

    const project = await useCase.execute({
      name: 'Acme Project',
      code: 'ACME-002',
      type: 'construction',
    });

    expect(project.image).toBeNull();
  });

  it('defaults isDemo to false and purges demo data after creation', async () => {
    const repository = new InMemoryProjectRepository();
    const purger = new NoopDemoProjectPurger();
    const useCase = new CreateProjectUseCase(repository, new SequentialIdGenerator(), purger);

    const project = await useCase.execute({
      name: 'Acme Project',
      code: 'ACME-003',
      type: 'construction',
    });

    expect(project.isDemo).toBe(false);
    expect(purger.callCount).toBe(1);
  });

  it('does not fail project creation when purging demo data throws', async () => {
    const repository = new InMemoryProjectRepository();
    const failingPurger: DemoProjectPurger = {
      purgeDemoProjects: () => Promise.reject(new Error('boom')),
    };
    const useCase = new CreateProjectUseCase(repository, new SequentialIdGenerator(), failingPurger);

    const project = await useCase.execute({
      name: 'Acme Project',
      code: 'ACME-004',
      type: 'construction',
    });

    expect(project.id).toBeDefined();
  });
});
