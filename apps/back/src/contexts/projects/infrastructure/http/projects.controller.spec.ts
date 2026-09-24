import { ForbiddenException } from '@nestjs/common';
import { Project } from '../../domain/project';
import { ProjectSummary } from '../../domain/project-summary';
import { ProjectsController } from './projects.controller';

function buildProject(planningEnabled = false): Project {
  return Project.create({
    id: 'project-1',
    name: 'Project',
    code: 'PRJ-001',
    type: 'construction',
    status: 'active',
    description: null,
    clientId: 'client-1',
    address: null,
    startDate: null,
    endDate: null,
    budget: null,
    currency: 'EUR',
    manager: null,
    image: null,
    color: null,
    planningEnabled,
  });
}

function buildSummary(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: 'project-1',
    name: 'Project',
    code: 'PRJ-001',
    currency: 'EUR',
    financials: [],
    documentCount: 2,
    pendingCount: 1,
    image: null,
    color: null,
    planningEnabled: true,
    checklistAssigned: true,
    checklistCompletedCount: 1,
    checklistTotalCount: 4,
    ...overrides,
  };
}

function buildController() {
  const createExecute = jest.fn().mockResolvedValue(buildProject(true));
  const updateExecute = jest.fn().mockResolvedValue(buildProject(false));
  const listExecute = jest.fn().mockResolvedValue([buildSummary()]);
  const findSummaryById = jest.fn().mockResolvedValue(buildSummary());
  const getExecute = jest.fn().mockResolvedValue(buildProject(true));
  const controller = new ProjectsController(
    { execute: listExecute } as never,
    { execute: getExecute } as never,
    { execute: createExecute } as never,
    { execute: updateExecute } as never,
    { execute: jest.fn() } as never,
    { execute: jest.fn() } as never,
    { findById: jest.fn().mockResolvedValue(null) } as never,
    { findSummaryById } as never,
  );
  return { controller, createExecute, updateExecute, listExecute, findSummaryById, getExecute };
}

describe('ProjectsController planning permissions and progress', () => {
  it('requires planning edit to assign a checklist while creating a project', async () => {
    const { controller, createExecute } = buildController();

    await expect(controller.create({
      name: 'Project',
      code: 'PRJ-001',
      type: 'construction',
      clientId: 'client-1',
      checklistTemplateId: 'template-1',
    }, {
      canAccess: (_module, level) => level !== 'edit',
    })).rejects.toBeInstanceOf(ForbiddenException);
    expect(createExecute).not.toHaveBeenCalled();
  });

  it('requires planning edit to toggle planning in settings', async () => {
    const { controller, updateExecute } = buildController();

    await expect(controller.update('project-1', { planningEnabled: false }, {
      canAccess: (_module, level) => level !== 'edit',
    })).rejects.toBeInstanceOf(ForbiddenException);
    expect(updateExecute).not.toHaveBeenCalled();
  });

  it('omits list progress for planning viewers without permission', async () => {
    const { controller } = buildController();

    const summaries = await controller.list({
      canAccess: (module) => module !== 'planning',
    });
    expect(JSON.stringify(summaries)).not.toContain('checklistCompletedCount');
    expect(JSON.stringify(summaries)).not.toContain('checklistTotalCount');
  });

  it('returns checklist assignment state for planning viewers without disabled checklist content', async () => {
    const { controller, findSummaryById, getExecute } = buildController();
    const allowed = await controller.get('project-1', { canAccess: () => true });
    expect(allowed.checklistAssigned).toBe(true);
    expect(allowed.checklistCompletedCount).toBe(1);
    expect(allowed.checklistTotalCount).toBe(4);
    expect(findSummaryById).toHaveBeenCalledWith('project-1');

    getExecute.mockResolvedValueOnce(buildProject(false));
    findSummaryById.mockResolvedValueOnce(buildSummary({ planningEnabled: false, checklistAssigned: true }));
    const disabledWithSnapshot = await controller.get('project-1', { canAccess: () => true });
    expect(disabledWithSnapshot.checklistAssigned).toBe(true);
    expect(disabledWithSnapshot.checklistCompletedCount).toBeUndefined();
    expect(disabledWithSnapshot.checklistTotalCount).toBeUndefined();
    expect(disabledWithSnapshot).not.toHaveProperty('items');

    getExecute.mockResolvedValueOnce(buildProject(false));
    findSummaryById.mockResolvedValueOnce(buildSummary({ planningEnabled: false, checklistAssigned: false }));
    const noSnapshot = await controller.get('project-1', { canAccess: () => true });
    expect(noSnapshot.checklistAssigned).toBe(false);

    const denied = await controller.get('project-1', {
      canAccess: (module) => module !== 'planning',
    });
    expect(denied.checklistAssigned).toBeUndefined();
    expect(denied.checklistCompletedCount).toBeUndefined();
    expect(findSummaryById).toHaveBeenCalledTimes(3);
  });
});
