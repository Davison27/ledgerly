import { App } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  addClient,
  removeClient,
  restoreClient,
  updateClientModel,
} from '@/entities/client';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { ThemeModeProvider } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { CompaniesPage } from '@/pages/companies';
import type { CompaniesPageModel } from '../../model/useCompaniesPage';
import { CompaniesPage as CompaniesPageView } from './CompaniesPage';

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn(), useQueryClient: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: vi.fn() }));
vi.mock('@/entities/client', () => ({
  addClient: vi.fn(),
  clientQueries: {
    all: ['clients'],
    list: vi.fn(() => ({ queryKey: ['clients', 'list'] })),
    detail: vi.fn((id: string) => ({ queryKey: ['clients', 'detail', id] })),
  },
  removeClient: vi.fn(),
  restoreClient: vi.fn(),
  updateClientModel: vi.fn(),
}));
vi.mock('@/entities/project', () => ({ projectQueries: { all: ['projects'] } }));
vi.mock('@/entities/document', () => ({ documentQueries: { all: ['documents'] } }));
vi.mock('@/entities/workspace-member', () => ({ useWorkspaceAccess: vi.fn() }));
vi.mock('@/shared/ui/PageContainer', () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

const clients = [
  {
    id: 'client-active',
    name: 'Active client',
    taxId: 'B12345678',
    contactName: 'Ada Lovelace',
    contactEmail: 'ada@example.com',
    contactPhone: null,
    archivedAt: null,
    projectCount: 2,
  },
  {
    id: 'client-archived',
    name: 'Archived client',
    taxId: null,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    archivedAt: '2026-09-21T10:00:00.000Z',
    projectCount: 4,
  },
];

describe('CompaniesPage', () => {
  const invalidateQueries = vi.fn().mockResolvedValue(undefined);
  const fetchQuery = vi.fn().mockResolvedValue(clients[0]);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(vi.fn() as never);
    vi.mocked(useWorkspaceAccess).mockReturnValue({ canAccess: () => true } as never);
    vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries, fetchQuery } as never);
    vi.mocked(useQuery).mockReturnValue({ isPending: false, isError: false, data: clients } as never);
  });

  function renderPage() {
    return render(
      <ThemeModeProvider>
        <App>
          <CompaniesPage />
        </App>
      </ThemeModeProvider>,
    );
  }

  it('renders the supplied model state without owning page data logic', () => {
    const model = {
      t: (key: string) => key,
      clients: [],
      visibleClients: [],
      isPending: true,
      isError: false,
      showArchived: false,
      setShowArchived: vi.fn(),
      canEdit: false,
      isFormOpen: false,
      editingClient: null,
      submitting: false,
      deletingId: null,
      unarchivingId: null,
      handleAdd: vi.fn(),
      handleEdit: vi.fn(),
      handleSubmit: vi.fn(),
      handleDelete: vi.fn(),
      handleUnarchive: vi.fn(),
      closeForm: vi.fn(),
      onOpenClient: undefined,
    } as unknown as CompaniesPageModel;

    render(
      <ThemeModeProvider>
        <App>
          <CompaniesPageView model={model} />
        </App>
      </ThemeModeProvider>,
    );

    expect(document.querySelectorAll('.ant-skeleton').length).toBeGreaterThan(0);
  });

  it('hides archived cards by default and opens historical cards when requested', async () => {
    const user = userEvent.setup();

    renderPage();

    expect(screen.getByText('Active client')).toBeInTheDocument();
    expect(screen.queryByText('Archived client')).not.toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: 'Mostrar archivadas' }));

    expect(screen.getByText('Archived client')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir proyectos: Archived client' })).toHaveAttribute(
      'href',
      '/companies/client-archived/projects',
    );
  });

  it('creates a company from the directory action', async () => {
    const user = userEvent.setup();
    vi.mocked(addClient).mockResolvedValue({
      id: 'client-new',
      name: 'New company',
      archivedAt: null,
      projectCount: 0,
    } as never);

    renderPage();

    await user.click(screen.getByRole('button', { name: /Añadir empresa/ }));
    await user.type(screen.getByLabelText('Nombre'), 'New company');
    await user.click(screen.getByRole('button', { name: 'Crear empresa' }));

    await waitFor(() => expect(addClient).toHaveBeenCalledWith({ name: 'New company' }));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['clients'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['projects'] });
  });

  it('archives a referenced company and refreshes historical views', async () => {
    const user = userEvent.setup();
    vi.mocked(removeClient).mockResolvedValue('archived');

    renderPage();

    await user.click(screen.getByRole('button', { name: 'Eliminar: Active client' }));
    await user.click(await screen.findByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(removeClient).toHaveBeenCalledWith('client-active'));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['documents'] });
  });

  it('opens the edit form and supports unarchiving an archived company', async () => {
    const user = userEvent.setup();
    vi.mocked(restoreClient).mockResolvedValue('unarchived');

    renderPage();

    await user.click(screen.getByRole('switch', { name: 'Mostrar archivadas' }));
    await user.click(screen.getByRole('button', { name: 'Modificar: Active client' }));
    expect(fetchQuery).toHaveBeenCalledWith({ queryKey: ['clients', 'detail', 'client-active'] });
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Desarchivar' }));
    await waitFor(() => expect(restoreClient).toHaveBeenCalledWith('client-archived'));
    expect(screen.getByText('Empresa desarchivada')).toBeInTheDocument();
    expect(updateClientModel).not.toHaveBeenCalled();
  });
});
