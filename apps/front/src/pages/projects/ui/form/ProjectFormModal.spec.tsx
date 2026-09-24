import { App, Form, Input } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '@/entities/project';
import { ApiError } from '@/shared/api/httpClient';
import { ProjectFormModal } from './ProjectFormModal';

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
  allowedPermissions: [] as string[],
  templates: [{ id: 'template-1', name: 'Safety checklist', items: [] }],
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: vi.fn(() => ({
      data: mocks.templates,
      isPending: false,
      isError: false,
    })),
    useQueryClient: vi.fn(() => ({ invalidateQueries: mocks.invalidateQueries })),
  };
});

vi.mock('@/entities/workspace-member', () => ({
  useWorkspaceAccess: () => ({
    canAccess: (module: string, level: string) => mocks.allowedPermissions.includes(`${module}:${level}`),
  }),
}));

vi.mock('@/features/project-form', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/project-form')>();
  return {
    ...actual,
    ProjectFormFields: () => (
      <>
        <Form.Item name="name">
          <Input aria-label="Nombre" />
        </Form.Item>
        <Form.Item name="code">
          <Input aria-label="Código" />
        </Form.Item>
        <Form.Item name="type">
          <Input aria-label="Tipo" />
        </Form.Item>
        <Form.Item name="clientId">
          <Input aria-label="Cliente" />
        </Form.Item>
      </>
    ),
  };
});

describe('ProjectFormModal parent-client errors', () => {
  beforeEach(() => {
    mocks.invalidateQueries.mockClear();
    mocks.allowedPermissions = [];
  });

  function renderModal(onSubmit: (values: unknown) => void | Promise<void>, project?: Project) {
    return render(
      <App>
        <ProjectFormModal open project={project} onCancel={vi.fn()} onSubmit={onSubmit} />
      </App>,
    );
  }

  async function submitProject() {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Nombre'), 'Project One');
    await user.type(screen.getByLabelText('Código'), 'P-001');
    await user.type(screen.getByLabelText('Tipo'), 'client');
    await user.type(screen.getByLabelText('Cliente'), 'client-1');
    await user.click(screen.getByRole('button', { name: 'Crear proyecto' }));
  }

  it('keeps planning controls hidden without planning edit access', () => {
    renderModal(vi.fn());

    expect(screen.queryByRole('switch', { name: 'Activar lista de planificación' })).not.toBeInTheDocument();
  });

  it('requires a template when planning is enabled and submits its id for creation', async () => {
    mocks.allowedPermissions = ['projects:edit', 'planning:edit', 'planning:view'];
    const onSubmit = vi.fn();
    renderModal(onSubmit);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Nombre'), 'Project One');
    await user.type(screen.getByLabelText('Código'), 'P-001');
    await user.type(screen.getByLabelText('Tipo'), 'client');
    await user.type(screen.getByLabelText('Cliente'), 'client-1');
    await user.click(screen.getByRole('switch', { name: 'Activar lista de planificación' }));
    expect(screen.getByRole('combobox', { name: 'Plantilla de checklist' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Crear proyecto' }));

    expect(onSubmit).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText('Selecciona una plantilla')).toBeInTheDocument());

    await user.click(screen.getByRole('combobox', { name: 'Plantilla de checklist' }));
    await user.click(await screen.findByText('Safety checklist'));
    await user.click(screen.getByRole('button', { name: 'Crear proyecto' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ checklistTemplateId: 'template-1' }),
    ));
  });

  it('does not include a checklist template when editing an existing project', async () => {
    mocks.allowedPermissions = ['projects:edit', 'planning:edit', 'planning:view'];
    const onSubmit = vi.fn();
    renderModal(onSubmit, {
      id: 'project-1',
      name: 'Project One',
      code: 'P-001',
      clientId: 'client-1',
    });
    const user = userEvent.setup();

    expect(screen.queryByRole('switch', { name: 'Activar lista de planificación' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]?.[0]).not.toHaveProperty('checklistTemplateId');
  });

  it('shows the required-client field error for INVALID_VALUE', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError(400, { code: 'INVALID_VALUE' }));
    renderModal(onSubmit);

    await submitProject();

    await waitFor(() => expect(screen.getByText('Selecciona un cliente')).toBeInTheDocument());
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
  });

  it.each([
    [404, 'ENTITY_NOT_FOUND', 'El cliente seleccionado ya no está disponible. Actualiza la lista de clientes e inténtalo de nuevo.'],
    [409, 'CLIENT_ARCHIVED', 'El cliente seleccionado está archivado. Elige un cliente activo.'],
  ] as const)('refreshes selector and project caches for %s/%s', async (status, code, message) => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError(status, { code }));
    renderModal(onSubmit);

    await submitProject();

    await waitFor(() => expect(screen.getByText(message)).toBeInTheDocument());
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['clients'] });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['projects'] });
    expect(screen.queryByText('Ya existe un proyecto con ese código.')).not.toBeInTheDocument();
  });
});
