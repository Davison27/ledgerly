import { Project } from '../../domain/project';
import { ProjectRepository } from '../../domain/project.repository';
import { ProjectNotFoundException } from '../../domain/errors/project-not-found.exception';
import { UnarchiveProjectUseCase } from './unarchive-project.use-case';

function buildProject(): Project {
  return Project.create({
    id: 'project-1',
    name: 'Project',
    code: 'PROJECT-1',
    type: 'client',
    status: 'archived',
    description: null,
    clientId: null,
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

describe('UnarchiveProjectUseCase', () => {
  it('restores an existing project to the active lifecycle', async () => {
    const unarchive = jest.fn().mockResolvedValue(undefined);
    const repository = {
      findById: jest.fn().mockResolvedValue(buildProject()),
      unarchive,
    } as unknown as ProjectRepository;
    const useCase = new UnarchiveProjectUseCase(repository);

    await useCase.execute('project-1');

    expect(unarchive).toHaveBeenCalledWith('project-1');
  });

  it('rejects an unknown project', async () => {
    const unarchive = jest.fn();
    const repository = {
      findById: jest.fn().mockResolvedValue(null),
      unarchive,
    } as unknown as ProjectRepository;
    const useCase = new UnarchiveProjectUseCase(repository);

    await expect(useCase.execute('missing-project')).rejects.toThrow(ProjectNotFoundException);
    expect(unarchive).not.toHaveBeenCalled();
  });
});
