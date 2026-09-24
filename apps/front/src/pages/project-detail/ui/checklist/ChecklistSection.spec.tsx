import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectChecklistDto } from '@/entities/project-checklist';
import { ChecklistSection } from './ChecklistSection';

const mocks = vi.hoisted(() => ({
  getProjectChecklist: vi.fn(),
  addProjectChecklistItem: vi.fn(),
  updateProjectChecklistItem: vi.fn(),
  deleteProjectChecklistItem: vi.fn(),
  allowedPermissions: [] as string[],
}));

vi.mock('@/entities/project-checklist', () => ({
  projectChecklistQueries: {
    project: (projectId: string) => ({
      queryKey: ['project-checklist', 'project', projectId],
      queryFn: () => mocks.getProjectChecklist(projectId),
    }),
  },
  addProjectChecklistItem: mocks.addProjectChecklistItem,
  updateProjectChecklistItem: mocks.updateProjectChecklistItem,
  deleteProjectChecklistItem: mocks.deleteProjectChecklistItem,
}));

vi.mock('@/entities/project', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/entities/project')>()),
  projectQueries: { all: ['projects'] },
}));

vi.mock('@/entities/workspace-member', () => ({
  useWorkspaceAccess: () => ({
    canAccess: (module: string, action: string) => mocks.allowedPermissions.includes(`${module}:${action}`),
  }),
}));

const project = { id: 'project-1', name: 'Project One', code: 'P-001' };
const checklist: ProjectChecklistDto = {
  projectId: 'project-1',
  name: 'Safety checklist',
  items: [
    { id: 'item-1', text: 'Prepare site', position: 0, completed: false },
    { id: 'item-2', text: 'Inspect equipment', position: 1, completed: true },
  ],
};

function renderSection(permissions: string[]) {
  mocks.allowedPermissions = permissions;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['project-checklist', 'project', project.id], checklist);
  const invalidateQueries = vi.spyOn(client, 'invalidateQueries');
  render(
    <QueryClientProvider client={client}>
      <App>
        <ChecklistSection project={project as never} />
      </App>
    </QueryClientProvider>,
  );
  return { client, invalidateQueries };
}

describe('ChecklistSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProjectChecklist.mockResolvedValue(checklist);
    mocks.addProjectChecklistItem.mockResolvedValue(checklist);
    mocks.updateProjectChecklistItem.mockResolvedValue(checklist);
    mocks.deleteProjectChecklistItem.mockResolvedValue(undefined);
  });

  it('shows items without mutation controls to members with view access only', () => {
    renderSection(['projects:view', 'planning:view']);

    expect(screen.getByText('Prepare site')).toBeInTheDocument();
    expect(screen.getByText('Inspect equipment')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Marcar Prepare site como completado' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Añadir elemento' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar elemento' })).not.toBeInTheDocument();
  });

  it('adds, edits, reorders, completes, and deletes items for project and planning editors', async () => {
    const user = userEvent.setup();
    const { invalidateQueries } = renderSection(['projects:view', 'projects:edit', 'planning:view', 'planning:edit']);

    await user.type(screen.getByRole('textbox', { name: 'Elemento del checklist' }), 'Close site');
    await user.click(screen.getByRole('button', { name: 'Añadir elemento' }));
    await waitFor(() => expect(mocks.addProjectChecklistItem).toHaveBeenCalledWith('project-1', 'Close site'));

    await user.click(screen.getByRole('checkbox', { name: 'Marcar Prepare site como completado' }));
    await waitFor(() => expect(mocks.updateProjectChecklistItem).toHaveBeenCalledWith(
      'project-1',
      'item-1',
      { completed: true },
    ));

    const firstRow = screen.getByText('Prepare site').closest('[data-checklist-item]');
    expect(firstRow).not.toBeNull();
    await user.click(within(firstRow as HTMLElement).getByRole('button', { name: 'Mover elemento abajo' }));
    await waitFor(() => expect(mocks.updateProjectChecklistItem).toHaveBeenCalledWith(
      'project-1',
      'item-1',
      { position: 1 },
    ));

    await user.click(screen.getAllByRole('button', { name: 'Editar elemento' })[0]);
    const editInput = screen.getByRole('textbox', { name: 'Editar elemento' });
    await user.clear(editInput);
    await user.type(editInput, 'Prepare work site');
    await user.click(screen.getByRole('button', { name: 'Guardar elemento' }));
    await waitFor(() => expect(mocks.updateProjectChecklistItem).toHaveBeenCalledWith(
      'project-1',
      'item-1',
      { text: 'Prepare work site' },
    ));

    await user.click(screen.getAllByRole('button', { name: 'Eliminar elemento' })[0]);
    await waitFor(() => expect(mocks.deleteProjectChecklistItem).toHaveBeenCalledWith('project-1', 'item-1'));
    expect(invalidateQueries).toHaveBeenCalled();
  });
});
