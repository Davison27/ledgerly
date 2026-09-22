import { App, ConfigProvider } from 'antd';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PermissionMatrixDto } from '@/entities/workspace-member';
import { matrixForRole } from '@/entities/workspace-member';
import { MemberDrawer } from './MemberDrawer';

function renderInvite(onInvite: ReturnType<typeof vi.fn>) {
  return render(
    <ConfigProvider>
      <App>
        <MemberDrawer
          drawer={{ mode: 'invite' }}
          submitting={false}
          onClose={vi.fn()}
          onInvite={onInvite}
          onSave={vi.fn()}
        />
      </App>
    </ConfigProvider>,
  );
}

async function completeInvite(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText('Ej. Marta Ruiz'), 'Marta Ruiz');
  await user.type(screen.getByPlaceholderText('Ej. marta@empresa.com'), 'marta@empresa.com');
  await user.click(screen.getByRole('button', { name: 'Enviar invitación' }));
}

describe('MemberDrawer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('invites members with the explicit member role and view-only section grants', async () => {
    const user = userEvent.setup();
    const onInvite = vi.fn().mockResolvedValue(undefined);
    const getComputedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => getComputedStyle(element));
    renderInvite(onInvite);

    expect(screen.getByRole('radio', { name: /Miembro/ })).toBeChecked();
    await completeInvite(user);

    expect(onInvite).toHaveBeenCalledWith(
      { name: 'Marta Ruiz', email: 'marta@empresa.com' },
      'member',
      matrixForRole('member'),
      expect.anything(),
    );
  });

  it('invites administrators with full-access defaults and hides the member matrix', async () => {
    const user = userEvent.setup();
    const onInvite = vi.fn().mockResolvedValue(undefined);
    const getComputedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => getComputedStyle(element));
    renderInvite(onInvite);

    await user.click(screen.getByRole('radio', { name: /Administrador/ }));
    expect(screen.getByText(/Los administradores siempre tienen acceso total/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Permiso para Proyectos')).not.toBeInTheDocument();

    await completeInvite(user);

    const submittedPermissions = onInvite.mock.calls[0]?.[2] as PermissionMatrixDto;
    expect(onInvite.mock.calls[0]?.[1]).toBe('admin');
    expect(submittedPermissions).toEqual(matrixForRole('admin'));
  });
});
