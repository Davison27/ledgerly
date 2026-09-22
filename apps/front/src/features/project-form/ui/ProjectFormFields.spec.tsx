import { App, ConfigProvider, Form } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Client } from '@/entities/client';
import { ThemeModeProvider } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { ProjectFormFields, type ProjectFormFieldValues } from './ProjectFormFields';

const clientField = vi.hoisted(() => ({
  clients: [
    { id: 'client-active', name: 'Active client', taxId: 'B12345678', archivedAt: null },
  ],
  clientsPending: false,
  createOpen: false,
  createValues: { name: '', taxId: '' },
  creating: false,
  setCreateValues: vi.fn(),
  openCreate: vi.fn(),
  closeCreate: vi.fn(),
  create: vi.fn(),
}));

vi.mock('../model/useProjectClientField', () => ({
  useProjectClientField: () => clientField,
}));

function renderFields(
  initialValues?: Partial<ProjectFormFieldValues>,
  currentClient?: Client | null,
  lockedClient?: { id: string; name: string },
) {
  const onFinish = vi.fn();
  render(
    <ConfigProvider>
      <ThemeModeProvider>
        <App>
          <Form<ProjectFormFieldValues>
            layout="vertical"
            initialValues={initialValues}
            onFinish={onFinish}
          >
            <ProjectFormFields
              image={null}
              onImageChange={vi.fn()}
              currentClient={currentClient}
              lockedClientId={lockedClient?.id}
              lockedClientName={lockedClient?.name}
            />
            <button type="submit">Submit project</button>
          </Form>
        </App>
      </ThemeModeProvider>
    </ConfigProvider>,
  );
  return { onFinish };
}

describe('ProjectFormFields', () => {
  beforeEach(() => {
    clientField.openCreate.mockReset();
    clientField.closeCreate.mockReset();
    clientField.setCreateValues.mockReset();
    clientField.create.mockReset();
  });

  it('requires a client before submitting', async () => {
    const user = userEvent.setup();
    const { onFinish } = renderFields({ name: 'Project', code: 'P-001', type: 'client' });

    await user.click(screen.getByRole('button', { name: 'Submit project' }));

    await waitFor(() => expect(screen.getByText('Selecciona un cliente')).toBeInTheDocument());
    expect(onFinish).not.toHaveBeenCalled();
  });

  it('keeps an archived current parent read-only until reassignment is explicit', async () => {
    const user = userEvent.setup();
    const archivedClient: Client = {
      id: 'client-archived',
      name: 'Archived client',
      archivedAt: '2026-01-01T00:00:00.000Z',
      projectCount: 1,
    };
    renderFields({ name: 'Project', code: 'P-001', type: 'client', clientId: archivedClient.id }, archivedClient);

    expect(screen.getByText('El cliente actual está archivado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reasignar cliente' })).toBeInTheDocument();
    expect(document.querySelector('.ant-select-disabled')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Reasignar cliente' }));

    expect(document.querySelector('.ant-select-disabled')).toBeNull();
  });

  it('locks the route client during scoped creation', () => {
    renderFields(
      { name: 'Project', code: 'P-001', type: 'client', clientId: 'client-scoped' },
      null,
      { id: 'client-scoped', name: 'Scoped client' },
    );

    expect(document.querySelector('.ant-select-disabled')).not.toBeNull();
    expect(screen.getByText('Scoped client')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crear cliente' })).not.toBeInTheDocument();
  });
});
