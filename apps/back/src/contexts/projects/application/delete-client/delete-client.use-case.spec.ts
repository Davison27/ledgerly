import { DeleteClientUseCase } from './delete-client.use-case';
import { ProjectClientLifecycleCoordinator } from '../../domain/project-client-lifecycle-coordinator.port';

class InMemoryProjectClientLifecycleCoordinator implements ProjectClientLifecycleCoordinator {
  constructor(private readonly outcome: 'deleted' | 'archived') {}

  saveProjectForActiveClient(): Promise<void> {
    return Promise.resolve();
  }

  deleteOrArchiveClient(): Promise<'deleted' | 'archived'> {
    return Promise.resolve(this.outcome);
  }
}

describe('DeleteClientUseCase', () => {
  it('returns archived when the locked client has projects', async () => {
    const useCase = new DeleteClientUseCase(
      new InMemoryProjectClientLifecycleCoordinator('archived'),
    );

    await expect(useCase.execute('client-1')).resolves.toBe('archived');
  });

  it('returns deleted when the locked client has no projects', async () => {
    const useCase = new DeleteClientUseCase(
      new InMemoryProjectClientLifecycleCoordinator('deleted'),
    );

    await expect(useCase.execute('client-1')).resolves.toBe('deleted');
  });
});
