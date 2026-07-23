import { ListSchedulableProjectsUseCase } from './list-schedulable-projects.use-case';
import { ScheduleProjectReader, ScheduleProjectView } from '../../domain/schedule-project-reader.port';

class FakeScheduleProjectReader implements ScheduleProjectReader {
  constructor(private readonly projects: ScheduleProjectView[]) {}

  findActive(): Promise<ScheduleProjectView[]> {
    return Promise.resolve(this.projects.filter((project) => project.status === 'active'));
  }

  findByIds(ids: string[]): Promise<ScheduleProjectView[]> {
    return Promise.resolve(this.projects.filter((project) => ids.includes(project.id)));
  }
}

const ACTIVE_PROJECT: ScheduleProjectView = {
  id: 'project-1',
  name: 'Feria de muestras',
  code: 'FM-01',
  image: null,
  status: 'active',
  startDate: '2026-07-01',
  endDate: '2026-07-31',
};

const COMPLETED_PROJECT: ScheduleProjectView = { ...ACTIVE_PROJECT, id: 'project-2', status: 'completed' };

describe('ListSchedulableProjectsUseCase', () => {
  it('returns only active projects', async () => {
    const useCase = new ListSchedulableProjectsUseCase(
      new FakeScheduleProjectReader([ACTIVE_PROJECT, COMPLETED_PROJECT]),
    );

    const projects = await useCase.execute();

    expect(projects).toEqual([ACTIVE_PROJECT]);
  });
});
