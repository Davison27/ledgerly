import { App, Form, Input } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/httpClient';
import { ProjectFormModal } from './ProjectFormModal';

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: vi.fn(() => ({ invalidateQueries: mocks.invalidateQueries })),
  };
});

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
  });

  function renderModal(onSubmit: (values: unknown) => void | Promise<void>) {
    return render(
      <App>
        <ProjectFormModal open onCancel={vi.fn()} onSubmit={onSubmit} />
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
