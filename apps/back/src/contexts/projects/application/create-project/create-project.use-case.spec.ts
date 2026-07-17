import { CreateProjectUseCase } from './create-project.use-case';
import { ProjectRepository } from '../../domain/project.repository';
import { Project } from '../../domain/project';
import { ProjectSummary } from '../../domain/project-summary';
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

  private toSummary(project: Project): ProjectSummary {
    return {
      id: project.id,
      name: project.name,
      code: project.code,
      documentCount: 0,
      pendingCount: 0,
      image: project.image,
    };
  }
}

class SequentialIdGenerator implements IdGenerator {
  private nextId = 1;

  generate(): string {
    return `generated-id-${this.nextId++}`;
  }
}

describe('CreateProjectUseCase', () => {
  it('creates a project with an image and persists it', async () => {
    const repository = new InMemoryProjectRepository();
    const useCase = new CreateProjectUseCase(repository, new SequentialIdGenerator());

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
    const useCase = new CreateProjectUseCase(repository, new SequentialIdGenerator());

    const project = await useCase.execute({
      name: 'Acme Project',
      code: 'ACME-002',
      type: 'construction',
    });

    expect(project.image).toBeNull();
  });
});
