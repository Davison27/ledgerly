import { App } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectQueries, removeProject } from '@/entities/project';
import { clientQueries } from '@/entities/client';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { useThemeMode } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { ProjectsPage } from './ProjectsPage';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
  useNavigate: vi.fn(),
  useParams: vi.fn(),
}));
vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn(), useQueryClient: vi.fn() }));
vi.mock('@/entities/project', () => ({
  projectQueries: { list: vi.fn(), all: ['projects'] },
  addProject: vi.fn(),
  updateProject: vi.fn(),
  removeProject: vi.fn(),
  unarchiveProject: vi.fn(),
}));
vi.mock('@/entities/client', () => ({
  clientQueries: {
    all: ['clients'],
    detail: vi.fn(() => ({ queryKey: ['clients', 'detail'] })),
  },
  parentClientError: vi.fn(() => null),
}));
vi.mock('@/entities/document', () => ({ documentQueries: { all: ['documents'] } }));
vi.mock('@/entities/workspace-member', () => ({ useWorkspaceAccess: vi.fn() }));
vi.mock('@/shared/lib/theme-mode/ThemeModeProvider', () => ({
  useThemeMode: vi.fn(),
}));
vi.mock('@/shared/ui/PageContainer', () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/shared/ui/PageHeader', () => ({
  PageHeader: ({ title, actions }: { title: React.ReactNode; actions?: React.ReactNode }) => (
    <header><h1>{title}</h1>{actions}</header>
  ),
}));
vi.mock('@/shared/ui/EmptyHint', () => ({
  EmptyHint: ({ title, action }: { title: React.ReactNode; action?: React.ReactNode }) => (
    <section><p>{title}</p>{action}</section>
  ),
}));
vi.mock('../card/ProjectCard', () => ({
  ProjectCard: ({
    project,
    onOpen,
    onDelete,
  }: {
    project: { id: string; name: string };
    onOpen: (project: { id: string; name: string }) => void;
    onDelete: (project: { id: string; name: string }) => void;
  }) => (
    <div>
      <button onClick={() => onOpen(project)}>{project.name}</button>
      <button aria-label="Eliminar proyecto" onClick={() => void onDelete(project)}>
        eliminar
      </button>
    </div>
  ),
}));
vi.mock('../form/ProjectFormModal', () => ({
  ProjectFormModal: ({ open }: { open: boolean }) => open ? <div role="dialog">formulario</div> : null,
}));

describe('ProjectsPage', () => {
  const navigate = vi.fn();

  beforeEach(() => {
    vi.mocked(useNavigate).mockReturnValue(navigate as never);
    vi.mocked(useParams).mockReturnValue({} as never);
    vi.mocked(useQuery).mockReset();
    vi.mocked(useQueryClient).mockReturnValue({} as never);
    vi.mocked(useThemeMode).mockReturnValue({ mode: 'light' } as never);
    vi.mocked(useWorkspaceAccess).mockReturnValue({ canAccess: () => true } as never);
  });

  it('renders loading placeholders while projects are pending', () => {
    vi.mocked(useQuery).mockReturnValue({ isPending: true } as never);
    render(<ProjectsPage />);
    expect(document.querySelectorAll('.ant-skeleton').length).toBeGreaterThan(0);
  });

  it('opens the create form from the editable empty state', async () => {
    const user = userEvent.setup();
    vi.mocked(useQuery).mockReturnValue({ isPending: false, data: [] } as never);
    render(<ProjectsPage />);
    await user.click(screen.getAllByRole('button', { name: /Añadir/ })[0]);
    expect(screen.getByRole('dialog')).toHaveTextContent('formulario');
  });

  it('navigates to a project when its card is opened', async () => {
    const user = userEvent.setup();
    vi.mocked(useQuery).mockReturnValue({ isPending: false, data: [{ id: 'p-1', name: 'Reforma' }] } as never);
    render(<ProjectsPage />);
    await user.click(screen.getByRole('button', { name: 'Reforma' }));
    expect(navigate).toHaveBeenCalledWith({ to: '/projects/$projectId', params: { projectId: 'p-1' } });
  });

  it('shows the archived toast when deletion archives a project', async () => {
    const user = userEvent.setup();
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries } as never);
    vi.mocked(useQuery).mockReturnValue({
      isPending: false,
      data: [{ id: 'p-1', name: 'Reforma', status: 'active' }],
    } as never);
    vi.mocked(removeProject).mockResolvedValue('archived');

    render(
      <App>
        <ProjectsPage />
      </App>,
    );

    await user.click(screen.getByRole('button', { name: 'Eliminar proyecto' }));

    await waitFor(() => {
      expect(screen.getByText('Proyecto archivado')).toBeInTheDocument();
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['projects'] });
  });

  it('loads a client-scoped list and shows the companies link above the project title', async () => {
    vi.mocked(useParams).mockReturnValue({ clientId: 'client-1' } as never);
    vi.mocked(clientQueries.detail).mockReturnValue({ queryKey: ['clients', 'detail', 'client-1'] } as never);
    vi.mocked(projectQueries.list).mockImplementation((clientId?: string) => ({
      queryKey: ['projects', 'list', clientId ?? null],
    }) as never);
    vi.mocked(useQuery).mockImplementation((options) => {
      const queryKey = (options as { queryKey?: unknown[] } | undefined)?.queryKey;
      if (queryKey?.[0] === 'clients') {
        return { isPending: false, isError: false, data: { id: 'client-1', name: 'Acme', archivedAt: null } } as never;
      }
      return { isPending: false, isError: false, data: [] } as never;
    });

    render(<ProjectsPage />);

    expect(projectQueries.list).toHaveBeenCalledWith('client-1');
    const backLink = screen.getByRole('link', { name: 'Empresas' });
    const title = screen.getByRole('heading', { name: 'Proyectos · Acme' });
    expect(backLink).toHaveAttribute('href', '/companies');
    expect(backLink).not.toContainElement(title);
    expect(backLink.nextElementSibling).toContainElement(title);
  });

  it('keeps creation unavailable for archived client history', () => {
    vi.mocked(useParams).mockReturnValue({ clientId: 'client-archived' } as never);
    vi.mocked(clientQueries.detail).mockReturnValue({ queryKey: ['clients', 'detail', 'client-archived'] } as never);
    vi.mocked(projectQueries.list).mockImplementation((clientId?: string) => ({
      queryKey: ['projects', 'list', clientId ?? null],
    }) as never);
    vi.mocked(useQuery).mockImplementation((options) => {
      const queryKey = (options as { queryKey?: unknown[] } | undefined)?.queryKey;
      if (queryKey?.[0] === 'clients') {
        return { isPending: false, isError: false, data: { id: 'client-archived', name: 'Legacy', archivedAt: '2026-01-01' } } as never;
      }
      return { isPending: false, isError: false, data: [] } as never;
    });

    render(<ProjectsPage />);

    expect(screen.queryByRole('button', { name: 'Añadir' })).not.toBeInTheDocument();
  });
});
