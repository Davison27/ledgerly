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
  clientId: 'client-1',
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
        planningEnabled: true,
        checklistCompletedCount: 2,
        checklistTotalCount: 5,
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
        planningEnabled: true,
        checklistCompletedCount: 2,
        checklistTotalCount: 5,
      },
    ]);
  });

  it('maps project summaries when access-controlled fields are omitted', async () => {
    vi.mocked(listProjects).mockResolvedValue([
      {
        id: 'project-1',
        name: 'Project One',
        code: 'P-001',
        currency: 'EUR',
      },
    ]);

    const [project] = await fetchProjects();

    expect(project.financials).toBeUndefined();
    expect(project.documentCount).toBeUndefined();
    expect(project.pendingCount).toBeUndefined();
  });

  it('maps a project detail and initializes list-only counters', async () => {
    vi.mocked(getProject).mockResolvedValue({
      id: 'project-1',
      name: 'Project One',
      code: 'P-001',
      type: 'client',
      status: 'active',
      description: null,
      clientId: 'client-1',
      client: null,
      budget: null,
      currency: null,
      image: null,
      color: null,
      planningEnabled: false,
      checklistAssigned: true,
    });

    const project = await fetchProject('project-1');

    expect(project).toEqual({
      id: 'project-1',
      name: 'Project One',
      code: 'P-001',
      documentCount: 0,
      pendingCount: 0,
      type: 'client',
      status: 'active',
      description: undefined,
      clientId: 'client-1',
      client: null,
      address: undefined,
      startDate: undefined,
      endDate: undefined,
      budget: undefined,
      currency: undefined,
      manager: undefined,
      image: undefined,
      color: undefined,
      planningEnabled: false,
      checklistAssigned: true,
    });
  });

  it('defaults new projects to the other type and delegates mutations', async () => {
    vi.mocked(createProject).mockResolvedValue({
      id: 'project-1',
      name: 'Project One',
      code: 'P-001',
      type: 'other',
      status: 'active',
      clientId: 'client-1',
      client: null,
    });
    vi.mocked(updateProjectRequest).mockResolvedValue({
      id: 'project-1',
      name: 'Project One',
      code: 'P-001',
      type: 'client',
      status: 'active',
      clientId: 'client-1',
      client: null,
    });
    vi.mocked(deleteProject).mockResolvedValue({ outcome: 'deleted' });

    await addProject({ ...values, type: undefined });
    await updateProject('project-1', values);
    await removeProject('project-1');

    expect(createProject).toHaveBeenCalledWith({
      name: 'Project One',
      code: 'P-001',
      type: 'other',
      status: 'active',
      description: 'Description',
      clientId: 'client-1',
      address: undefined,
      startDate: undefined,
      endDate: undefined,
      budget: 1000,
      currency: 'EUR',
      manager: undefined,
      image: undefined,
      color: undefined,
    });
    expect(updateProjectRequest).toHaveBeenCalledWith('project-1', {
      name: 'Project One',
      code: 'P-001',
      type: 'client',
      status: 'active',
      description: 'Description',
      clientId: 'client-1',
      address: undefined,
      startDate: undefined,
      endDate: undefined,
      budget: 1000,
      currency: 'EUR',
      manager: undefined,
      image: undefined,
      color: undefined,
    });
    expect(deleteProject).toHaveBeenCalledWith('project-1');
  });

  it('omits the client parent when an update does not change it', async () => {
    vi.mocked(updateProjectRequest).mockResolvedValue({
      id: 'project-1',
      name: 'Updated project',
      code: 'P-001',
      type: 'client',
      status: 'active',
      clientId: 'client-1',
      client: null,
    });

    await updateProject('project-1', { name: 'Updated project' });

    const payload = vi.mocked(updateProjectRequest).mock.calls[0]?.[1];
    expect(payload).not.toHaveProperty('clientId');
    expect(payload).toMatchObject({ name: 'Updated project' });
  });

  it('sends a selected checklist template only through project creation', async () => {
    vi.mocked(createProject).mockResolvedValue({
      id: 'project-1',
      name: 'Project One',
      code: 'P-001',
      type: 'client',
      status: 'active',
      clientId: 'client-1',
      client: null,
    });
    vi.mocked(updateProjectRequest).mockResolvedValue({
      id: 'project-1',
      name: 'Project One',
      code: 'P-001',
      type: 'client',
      status: 'active',
      clientId: 'client-1',
      client: null,
    });

    await addProject({ ...values, checklistTemplateId: 'template-1' });
    await updateProject('project-1', { name: 'Project One' });

    expect(createProject).toHaveBeenCalledWith(expect.objectContaining({
      checklistTemplateId: 'template-1',
    }));
    const updatePayload = vi.mocked(updateProjectRequest).mock.calls[0]?.[1];
    expect(updatePayload).not.toHaveProperty('checklistTemplateId');
    expect(updatePayload).not.toHaveProperty('planningEnabled');
  });
});
