import { ListSchedulableProjectsUseCase } from './list-schedulable-projects.use-case';
import {
  ScheduleProjectReader,
  ScheduleProjectView,
  SchedulableProjectView,
} from '../../domain/schedule-project-reader.port';

const projectImage = `data:image/png;base64,${Buffer.from('89504e470d0a1a0a00000000', 'hex').toString('base64')}`;

class FakeScheduleProjectReader implements ScheduleProjectReader {
  constructor(private readonly projects: SchedulableProjectView[]) {}

  findActive(): Promise<SchedulableProjectView[]> {
    return Promise.resolve(this.projects.filter((project) => project.status === 'active'));
  }

  findByIds(ids: string[]): Promise<ScheduleProjectView[]> {
    return Promise.resolve(this.projects.filter((project) => ids.includes(project.id)));
  }
}

const ACTIVE_PROJECT: SchedulableProjectView = {
  id: 'project-1',
  name: 'Feria de muestras',
  code: 'FM-01',
  image: projectImage,
  status: 'active',
  startDate: '2026-07-01',
  endDate: '2026-07-31',
  color: null,
  hasEvents: false,
};

const COMPLETED_PROJECT: SchedulableProjectView = { ...ACTIVE_PROJECT, id: 'project-2', status: 'completed' };

describe('ListSchedulableProjectsUseCase', () => {
  it('returns only active projects', async () => {
    const useCase = new ListSchedulableProjectsUseCase(
      new FakeScheduleProjectReader([ACTIVE_PROJECT, COMPLETED_PROJECT]),
    );

    const projects = await useCase.execute();

    expect(projects).toEqual([ACTIVE_PROJECT]);
    expect(projects[0].image).toBe(projectImage);
  });
});
