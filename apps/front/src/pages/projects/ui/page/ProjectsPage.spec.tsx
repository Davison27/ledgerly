import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { useThemeMode } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { ProjectsPage } from './ProjectsPage';

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn(), useQueryClient: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: vi.fn() }));
vi.mock('@/entities/project', () => ({
  projectQueries: { list: vi.fn(), all: ['projects'] }, addProject: vi.fn(), updateProject: vi.fn(), removeProject: vi.fn(),
}));
vi.mock('@/entities/workspace-member', () => ({ useWorkspaceAccess: vi.fn() }));
vi.mock('@/shared/lib/theme-mode/ThemeModeProvider', () => ({ useThemeMode: vi.fn() }));
vi.mock('@/shared/ui/PageContainer', () => ({ PageContainer: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock('@/shared/ui/PageHeader', () => ({ PageHeader: ({ title, actions }: { title: React.ReactNode; actions?: React.ReactNode }) => <header><h1>{title}</h1>{actions}</header> }));
vi.mock('@/shared/ui/EmptyHint', () => ({ EmptyHint: ({ title, action }: { title: React.ReactNode; action?: React.ReactNode }) => <section><p>{title}</p>{action}</section> }));
vi.mock('../card/ProjectCard', () => ({ ProjectCard: ({ project, onOpen }: { project: { id: string; name: string }; onOpen: (project: { id: string; name: string }) => void }) => <button onClick={() => onOpen(project)}>{project.name}</button> }));
vi.mock('../form/ProjectFormModal', () => ({ ProjectFormModal: ({ open }: { open: boolean }) => open ? <div role="dialog">formulario</div> : null }));

describe('ProjectsPage', () => {
  const navigate = vi.fn();

  beforeEach(() => {
    vi.mocked(useNavigate).mockReturnValue(navigate as never);
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
});
