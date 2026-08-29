import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addProject,
  fetchProject,
  fetchProjects,
  removeProject,
  updateProject,
  type ProjectFormValues,
} from './project';
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject as updateProjectRequest,
} from '../api/projects.api';

vi.mock('../api/projects.api', () => ({
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  getProject: vi.fn(),
  listProjects: vi.fn(),
  updateProject: vi.fn(),
}));

const values: ProjectFormValues = {
  name: 'Project One',
  code: 'P-001',
  type: 'client',
  status: 'active',
  description: 'Description',
  clientCompany: 'Acme',
  budget: 1000,
  currency: 'EUR',
};

describe('project view model', () => {
  beforeEach(() => {
    vi.mocked(listProjects).mockReset();
    vi.mocked(getProject).mockReset();
    vi.mocked(createProject).mockReset();
    vi.mocked(updateProjectRequest).mockReset();
    vi.mocked(deleteProject).mockReset();
  });

  it('maps project summaries and financials returned by the list endpoint', async () => {
    vi.mocked(listProjects).mockResolvedValue([
      {
        id: 'project-1',
        name: 'Project One',
        code: 'P-001',
        currency: 'EUR',
        financials: [{ currency: 'EUR', income: 100, expenses: 40, profit: 60, margin: 0.6 }],
        documentCount: 3,
        pendingCount: 1,
        image: null,
        color: null,
      },
    ]);

    await expect(fetchProjects()).resolves.toEqual([
      {
        id: 'project-1',
        name: 'Project One',
        code: 'P-001',
        currency: 'EUR',
        financials: [{ currency: 'EUR', income: 100, expenses: 40, profit: 60, margin: 0.6 }],
        documentCount: 3,
        pendingCount: 1,
        image: undefined,
        color: undefined,
      },
    ]);
  });

  it('maps a project detail and initializes list-only counters', async () => {
    vi.mocked(getProject).mockResolvedValue({
      id: 'project-1',
      name: 'Project One',
      code: 'P-001',
      type: 'client',
      status: 'active',
      description: null,
      budget: null,
      currency: null,
      image: null,
      color: null,
    });

    await expect(fetchProject('project-1')).resolves.toMatchObject({
      id: 'project-1',
      type: 'client',
      status: 'active',
      documentCount: 0,
      pendingCount: 0,
      description: undefined,
      budget: undefined,
      image: undefined,
      color: undefined,
    });
  });

  it('defaults new projects to the other type and delegates mutations', async () => {
    vi.mocked(createProject).mockResolvedValue({
      id: 'project-1',
      name: 'Project One',
      code: 'P-001',
      type: 'other',
      status: 'active',
    });
    vi.mocked(updateProjectRequest).mockResolvedValue({
      id: 'project-1',
      name: 'Project One',
      code: 'P-001',
      type: 'client',
      status: 'active',
    });

    await addProject({ ...values, type: undefined });
    await updateProject('project-1', values);
    await removeProject('project-1');

    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'other', name: 'Project One' }),
    );
    expect(updateProjectRequest).toHaveBeenCalledWith(
      'project-1',
      expect.objectContaining({ type: 'client' }),
    );
    expect(deleteProject).toHaveBeenCalledWith('project-1');
  });
});
