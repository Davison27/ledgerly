import { App } from 'antd';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProjectFinancialSummary } from '../../model/useProjectFinancialSummary';
import { ProjectDetailPage } from './ProjectDetailPage';

const mocks = vi.hoisted(() => ({
  permissions: [] as string[],
  useQuery: vi.fn(),
  useProjectFinancialSummary: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({ useQuery: mocks.useQuery }));
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ projectId: 'project-1' }),
}));
vi.mock('@/entities/project', () => ({
  projectQueries: { detail: (projectId: string) => ({ queryKey: ['projects', 'detail', projectId] }) },
}));
vi.mock('@/entities/workspace-member', () => ({
  useWorkspaceAccess: () => ({
    canAccess: (module: string, action: string) => mocks.permissions.includes(`${module}:${action}`),
  }),
}));
vi.mock('@/shared/lib/theme-mode/ThemeModeProvider', () => ({ useThemeMode: () => ({ mode: 'light' }) }));
vi.mock('../../model/useProjectFinancialSummary', () => ({
  useProjectFinancialSummary: mocks.useProjectFinancialSummary,
}));
vi.mock('../../model/useProjectDetailSection', () => ({
  getAllowedProjectDetailSections: () => ['checklist'],
  useProjectDetailSection: () => ({ section: 'checklist', setSection: vi.fn() }),
}));
vi.mock('../../model/projectHierarchy', () => ({ projectClientProjectsPath: () => '/companies/client-1/projects' }));
vi.mock('../documents/DocumentsSection', () => ({ DocumentsSection: () => null }));
vi.mock('../dashboard/DashboardSection', () => ({ DashboardSection: () => null }));
vi.mock('../schedule/ScheduleSection', () => ({ ScheduleSection: () => null }));
vi.mock('../settings/SettingsSection', () => ({ SettingsSection: () => null }));
vi.mock('../equipment/ProjectEquipmentSection', () => ({ ProjectEquipmentSection: () => null }));
vi.mock('../checklist/ChecklistSection', () => ({ ChecklistSection: () => null }));
vi.mock('@/shared/ui/DetailPageHeader', () => ({
  DetailPageHeader: ({ sections }: { sections: React.ReactNode }) => <header>{sections}</header>,
}));

const project = {
  id: 'project-1',
  name: 'Project One',
  code: 'P-001',
  client: { id: 'client-1', name: 'Client One' },
  planningEnabled: true,
  checklistCompletedCount: 1,
  checklistTotalCount: 2,
  currency: 'EUR',
  budget: 1000,
  status: 'active',
};

function renderPage(permissions: string[]) {
  mocks.permissions = permissions;
  render(
    <App>
      <ProjectDetailPage />
    </App>,
  );
}

describe('ProjectDetailPage checklist progress permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useQuery.mockReturnValue({ data: project, isPending: false, isError: false });
    mocks.useProjectFinancialSummary.mockReturnValue({
      data: { expenses: 987654321, margin: 0.25 },
      isPending: false,
      isError: false,
      isPartial: false,
    });
  });

  it('shows one checklist progress indicator to dashboard viewers with planning access', () => {
    renderPage([
      'projects:view',
      'dashboard:view',
      'documents:view',
      'equipment:view',
      'planning:view',
    ]);

    expect(screen.getByText('1 de 2 completados')).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar', { name: '1 de 2 completados' })).toHaveLength(1);
    expect(screen.getByText(/987/)).toBeInTheDocument();
    expect(useProjectFinancialSummary).toHaveBeenCalledWith('project-1', true, true, true);
  });

  it('shows one checklist progress indicator without dashboard data to planning viewers', () => {
    renderPage(['projects:view', 'planning:view']);

    expect(screen.getByText('1 de 2 completados')).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar', { name: '1 de 2 completados' })).toHaveLength(1);
    expect(screen.queryByText(/987/)).not.toBeInTheDocument();
    expect(useProjectFinancialSummary).toHaveBeenCalledWith('project-1', false, false, false);
  });
});
