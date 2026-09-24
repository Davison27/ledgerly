import { App } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createProjectChecklistTemplate,
  deleteProjectChecklistTemplate,
  updateProjectChecklistTemplate,
} from '@/entities/project-checklist';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { PlanningPage } from './PlanningPage';

const planningMocks = vi.hoisted(() => ({
  canEdit: true,
  templates: [] as Array<{
    id: string;
    name: string;
    items: Array<{ id: string; text: string; position: number }>;
  }>,
}));
vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn(), useQueryClient: vi.fn() }));
vi.mock('@/entities/project-checklist', () => ({
  createProjectChecklistTemplate: vi.fn(),
  deleteProjectChecklistTemplate: vi.fn(),
  projectChecklistQueries: { all: ['project-checklist'], templates: () => ({ queryKey: ['project-checklist', 'templates'] }) },
  updateProjectChecklistTemplate: vi.fn(),
}));
vi.mock('@/entities/workspace-member', () => ({
  useWorkspaceAccess: vi.fn(),
}));

describe('PlanningPage', () => {
  const invalidateQueries = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    planningMocks.canEdit = true;
    planningMocks.templates = [];
    vi.mocked(useWorkspaceAccess).mockReturnValue({
      canAccess: (_module: string, level: string) => level === 'view' || planningMocks.canEdit,
    } as never);
    vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries } as never);
    vi.mocked(useQuery).mockReturnValue({
      data: planningMocks.templates,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
  });

  function renderPage() {
    return render(
      <App>
        <PlanningPage />
      </App>,
    );
  }

  it('shows templates without mutation controls for view-only members', () => {
    planningMocks.canEdit = false;
    planningMocks.templates = [{
      id: 'template-1',
      name: 'Site preparation',
      items: [{ id: 'item-1', text: 'Review access', position: 0 }],
    }];
    vi.mocked(useQuery).mockReturnValue({ data: planningMocks.templates, isPending: false, isError: false } as never);

    renderPage();

    expect(screen.getByText('Site preparation')).toBeInTheDocument();
    expect(screen.getByText('Review access')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nueva lista' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar lista: Site preparation' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar lista: Site preparation' })).not.toBeInTheDocument();
  });

  it('creates a template with ordered items', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getAllByRole('button', { name: 'Nueva lista' })[0]);
    await user.type(screen.getByLabelText('Nombre de la lista'), 'Site preparation');
    await user.click(screen.getByRole('button', { name: 'Añadir elemento' }));
    await user.type(screen.getByLabelText('Elemento 1'), 'Review access');
    await user.click(screen.getByRole('button', { name: 'Añadir elemento' }));
    await user.type(screen.getByLabelText('Elemento 2'), 'Collect keys');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(createProjectChecklistTemplate).toHaveBeenCalledWith({
        name: 'Site preparation',
        items: ['Review access', 'Collect keys'],
      }),
    );
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['project-checklist'] });
  });

  it('edits ordered items and deletes a template', async () => {
    const user = userEvent.setup();
    planningMocks.templates = [{
      id: 'template-1',
      name: 'Site preparation',
      items: [
        { id: 'item-1', text: 'Review access', position: 0 },
        { id: 'item-2', text: 'Collect keys', position: 1 },
      ],
    }];
    vi.mocked(useQuery).mockReturnValue({ data: planningMocks.templates, isPending: false, isError: false } as never);
    vi.mocked(updateProjectChecklistTemplate).mockResolvedValue(planningMocks.templates[0] as never);
    vi.mocked(deleteProjectChecklistTemplate).mockResolvedValue(undefined);
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Editar lista: Site preparation' }));
    await user.click(screen.getByRole('button', { name: 'Bajar elemento 1' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(updateProjectChecklistTemplate).toHaveBeenCalledWith('template-1', {
        name: 'Site preparation',
        items: ['Collect keys', 'Review access'],
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Eliminar lista: Site preparation' }));
    await user.click(await screen.findByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(deleteProjectChecklistTemplate).toHaveBeenCalledWith('template-1'));
  });
});
