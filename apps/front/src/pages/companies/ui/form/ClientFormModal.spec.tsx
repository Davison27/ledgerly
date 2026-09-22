import { App } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ClientFormModal } from './ClientFormModal';

describe('ClientFormModal', () => {
  it('submits the complete client contact form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <App>
        <ClientFormModal open onCancel={vi.fn()} onSubmit={onSubmit} />
      </App>,
    );

    await user.type(screen.getByLabelText('Nombre'), 'Acme Studio');
    await user.type(screen.getByLabelText('CIF / NIF'), 'B12345678');
    await user.type(screen.getByLabelText('Persona de contacto'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Email de contacto'), 'ada@example.com');
    await user.type(screen.getByLabelText('Teléfono de contacto'), '+34 600 000 000');
    await user.click(screen.getByRole('button', { name: 'Crear empresa' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Acme Studio',
        taxId: 'B12345678',
        contactName: 'Ada Lovelace',
        contactEmail: 'ada@example.com',
        contactPhone: '+34 600 000 000',
      });
    });
  });

  it('requires a company name', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <App>
        <ClientFormModal open onCancel={vi.fn()} onSubmit={onSubmit} />
      </App>,
    );

    await user.click(screen.getByRole('button', { name: 'Crear empresa' }));

    await waitFor(() => expect(screen.getByText('El nombre de la empresa es obligatorio')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
