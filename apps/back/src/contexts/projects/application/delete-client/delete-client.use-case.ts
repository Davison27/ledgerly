import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_CLIENT_LIFECYCLE_COORDINATOR,
  ProjectClientLifecycleCoordinator,
} from '../../domain/project-client-lifecycle-coordinator.port';

@Injectable()
export class DeleteClientUseCase {
  constructor(
    @Inject(PROJECT_CLIENT_LIFECYCLE_COORDINATOR)
    private readonly projectClientLifecycleCoordinator: ProjectClientLifecycleCoordinator,
  ) {}

  async execute(id: string): Promise<'deleted' | 'archived'> {
    return this.projectClientLifecycleCoordinator.deleteOrArchiveClient(id);
  }
}
