import { App, ConfigProvider } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQueryClient } from '@tanstack/react-query';
import { updateProject, updateProjectPlanning, projectQueries } from '@/entities/project';
import { projectChecklistQueries } from '@/entities/project-checklist';
import { ApiError } from '@/shared/api/httpClient';
import { ThemeModeProvider } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { SettingsSection } from './SettingsSection';

const mocks = vi.hoisted(() => ({
  updateProject: vi.fn(),
  updateProjectPlanning: vi.fn(),
  invalidateQueries: vi.fn(),
  projectData: {} as Record<string, unknown>,
  checklistResult: {} as Record<string, unknown>,
  templatesResult: {} as Record<string, unknown>,
  allowedPermissions: [] as string[],
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: vi.fn((options: { queryKey: readonly unknown[] }) => {
      if (options.queryKey[0] === 'project-checklist') {
        return options.queryKey[1] === 'templates' ? mocks.templatesResult : mocks.checklistResult;
      }
      return { data: mocks.projectData, isPending: false, isError: false };
    }),
    useQueryClient: vi.fn(),
  };
});

vi.mock('@/entities/project', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/entities/project')>()),
  projectQueries: {
    all: ['projects'],
    detail: vi.fn(() => ({ queryKey: ['projects', 'detail', 'project-1'] })),
  list: vi.fn((clientId?: string) => ({ queryKey: ['projects', 'list', clientId ?? null] })),
  },
  updateProject: mocks.updateProject,
  updateProjectPlanning: mocks.updateProjectPlanning,
}));

vi.mock('@/entities/project-checklist', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/entities/project-checklist')>()),
}));

vi.mock('@/entities/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/entities/client')>()),
  clientQueries: { all: ['clients'] },
}));

vi.mock('@/entities/document', () => ({ documentQueries: { all: ['documents'] } }));

vi.mock('@/entities/workspace-member', () => ({
  useWorkspaceAccess: () => ({
    canAccess: (module: string, level: string) => mocks.allowedPermissions.includes(`${module}:${level}`),
  }),
}));

vi.mock('@/features/project-form/model/useProjectClientField', () => ({
  useProjectClientField: () => ({
    clients: [{ id: 'client-2', name: 'Active client', taxId: 'B12345678', archivedAt: null }],
    clientsPending: false,
    createOpen: false,
    createValues: { name: '', taxId: '' },
    creating: false,
    setCreateValues: vi.fn(),
    openCreate: vi.fn(),
    closeCreate: vi.fn(),
    create: vi.fn(),
  }),
}));

const fullProject = {
  id: 'project-1',
  name: 'Project One',
  code: 'P-001',
  documentCount: 0,
  pendingCount: 0,
  type: 'client' as const,
  status: 'active' as const,
  description: undefined,
  clientId: 'client-1',
  client: { id: 'client-1', name: 'Archived client', archivedAt: '2026-01-01T00:00:00.000Z' },
  address: undefined,
  startDate: undefined,
  endDate: undefined,
  budget: undefined,
  currency: 'EUR' as const,
  manager: undefined,
  image: null,
  color: undefined,
  planningEnabled: false,
  checklistAssigned: false,
};

describe('SettingsSection', () => {
  beforeEach(() => {
    mocks.projectData = fullProject;
    mocks.checklistResult = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new ApiError(404, { code: 'ENTITY_NOT_FOUND' }),
    };
    mocks.templatesResult = {
      data: [{ id: 'template-1', name: 'Safety checklist', items: [] }],
      isPending: false,
      isError: false,
    };
    vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries: mocks.invalidateQueries } as never);
    mocks.allowedPermissions = ['projects:view', 'projects:edit', 'planning:view', 'planning:edit'];
    mocks.updateProject.mockReset();
    mocks.updateProject.mockResolvedValue(fullProject);
    mocks.updateProjectPlanning.mockReset();
    mocks.updateProjectPlanning.mockResolvedValue(fullProject);
    mocks.invalidateQueries.mockReset();
  });

  it('requires a template for the first planning activation', async () => {
    const user = userEvent.setup();
    render(
      <ConfigProvider>
        <ThemeModeProvider>
          <App>
            <SettingsSection
              project={{ id: 'project-1', name: 'Project One', code: 'P-001', documentCount: 0, pendingCount: 0 }}
              color="terracotta"
            />
          </App>
        </ThemeModeProvider>
      </ConfigProvider>,
    );

    await waitFor(() => expect(screen.getByRole('switch', { name: 'Activar lista de planificación' })).toBeInTheDocument());
    await user.click(screen.getByRole('switch', { name: 'Activar lista de planificación' }));
    await user.click(screen.getByRole('combobox', { name: 'Plantilla de checklist' }));
    await user.click(await screen.findByText('Safety checklist'));
    await user.click(screen.getByRole('button', { name: 'Activar checklist' }));

    await waitFor(() => expect(updateProjectPlanning).toHaveBeenCalledWith('project-1', {
      planningEnabled: true,
      checklistTemplateId: 'template-1',
    }));
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: projectChecklistQueries.project('project-1').queryKey,
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: projectQueries.all });
  });

  it('disables a previously assigned active checklist without sending another template', async () => {
    mocks.projectData = { ...fullProject, planningEnabled: true, checklistAssigned: true };
    mocks.checklistResult = {
      data: {
        projectId: 'project-1',
        name: 'Safety checklist',
        items: [{ id: 'item-1', text: 'Check access', position: 0, completed: true }],
      },
      isPending: false,
      isError: false,
    };
    const user = userEvent.setup();
    render(
      <ConfigProvider>
        <ThemeModeProvider>
          <App>
            <SettingsSection
              project={{ id: 'project-1', name: 'Project One', code: 'P-001', documentCount: 0, pendingCount: 0 }}
              color="terracotta"
            />
          </App>
        </ThemeModeProvider>
      </ConfigProvider>,
    );

    await waitFor(() => expect(screen.getByRole('switch', { name: 'Activar lista de planificación' })).toBeInTheDocument());
    expect(screen.queryByRole('combobox', { name: 'Plantilla de checklist' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: 'Activar lista de planificación' }));

    await waitFor(() => expect(updateProjectPlanning).toHaveBeenCalledWith('project-1', {
      planningEnabled: false,
    }));
    expect(mocks.invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: projectChecklistQueries.project('project-1').queryKey,
    });
    expect(mocks.checklistResult).toMatchObject({
      data: { items: [{ id: 'item-1', text: 'Check access', completed: true }] },
    });
  });

  it('enables a disabled assigned checklist without showing the template selector', async () => {
    mocks.projectData = { ...fullProject, checklistAssigned: true };
    const user = userEvent.setup();
    render(
      <ConfigProvider>
        <ThemeModeProvider>
          <App>
            <SettingsSection
              project={{ id: 'project-1', name: 'Project One', code: 'P-001', documentCount: 0, pendingCount: 0 }}
              color="terracotta"
            />
          </App>
        </ThemeModeProvider>
      </ConfigProvider>,
    );

    const toggle = await screen.findByRole('switch', { name: 'Activar lista de planificación' });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);

    await waitFor(() => expect(updateProjectPlanning).toHaveBeenCalledWith('project-1', {
      planningEnabled: true,
    }));
    expect(screen.queryByRole('combobox', { name: 'Plantilla de checklist' })).not.toBeInTheDocument();
  });

  it('shows an archived parent and omits it from an unchanged settings update', async () => {
    const user = userEvent.setup();
    render(
      <ConfigProvider>
        <ThemeModeProvider>
          <App>
            <SettingsSection
              project={{
                id: 'project-1',
                name: 'Project One',
                code: 'P-001',
                documentCount: 0,
                pendingCount: 0,
                color: 'terracotta',
              }}
              color="terracotta"
            />
          </App>
        </ThemeModeProvider>
      </ConfigProvider>,
    );

    await waitFor(() => expect(screen.getByText('El cliente actual está archivado')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(updateProject).toHaveBeenCalledWith('project-1', expect.any(Object)));
    const payload = vi.mocked(updateProject).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload.clientId).toBeUndefined();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: projectQueries.all });
  });

  it('shows the required-client field error for INVALID_VALUE', async () => {
    const user = userEvent.setup();
    mocks.updateProject.mockRejectedValue(new ApiError(400, { code: 'INVALID_VALUE' }));
    render(
      <ConfigProvider>
        <ThemeModeProvider>
          <App>
            <SettingsSection
              project={{
                id: 'project-1',
                name: 'Project One',
                code: 'P-001',
                documentCount: 0,
                pendingCount: 0,
                color: 'terracotta',
              }}
              color="terracotta"
            />
          </App>
        </ThemeModeProvider>
      </ConfigProvider>,
    );

    await waitFor(() => expect(screen.getByText('El cliente actual está archivado')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(screen.getByText('Selecciona un cliente')).toBeInTheDocument());
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
  });

  it.each([
    [404, 'ENTITY_NOT_FOUND', 'El cliente seleccionado ya no está disponible. Actualiza la lista de clientes e inténtalo de nuevo.'],
    [409, 'CLIENT_ARCHIVED', 'El cliente seleccionado está archivado. Elige un cliente activo.'],
  ] as const)('refreshes selector and project caches for %s/%s', async (status, code, errorMessage) => {
    const user = userEvent.setup();
    mocks.updateProject.mockRejectedValue(new ApiError(status, { code }));
    render(
      <ConfigProvider>
        <ThemeModeProvider>
          <App>
            <SettingsSection
              project={{
                id: 'project-1',
                name: 'Project One',
                code: 'P-001',
                documentCount: 0,
                pendingCount: 0,
                color: 'terracotta',
              }}
              color="terracotta"
            />
          </App>
        </ThemeModeProvider>
      </ConfigProvider>,
    );

    await waitFor(() => expect(screen.getByText('El cliente actual está archivado')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(screen.getByText(errorMessage)).toBeInTheDocument());
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['clients'] });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: projectQueries.all });
    expect(screen.queryByText('Ya existe un proyecto con ese código.')).not.toBeInTheDocument();
  });
});
