import { App, ConfigProvider } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { updateProject, projectQueries } from '@/entities/project';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { ThemeModeProvider } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { SettingsSection } from './SettingsSection';

const mocks = vi.hoisted(() => ({
  updateProject: vi.fn(),
  invalidateQueries: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock('@/entities/project', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/entities/project')>()),
  projectQueries: {
    all: ['projects'],
    detail: vi.fn(() => ({ queryKey: ['projects', 'detail', 'project-1'] })),
  },
  updateProject: mocks.updateProject,
}));

vi.mock('@/entities/workspace-member', () => ({
  useWorkspaceAccess: vi.fn(),
}));

vi.mock('@/features/project-form/model/useProjectClientField', () => ({
  useProjectClientField: () => ({
    clients: [{ id: 'client-2', name: 'Active client', taxId: 'B12345678', archivedAt: null }],
    clientsPending: false,
    createOpen: false,
    createValues: { name: '', taxId: '' },
    creating: false,
    setCreateValues: vi.fn(),
    openCreate: vi.fn(),
    closeCreate: vi.fn(),
    create: vi.fn(),
  }),
}));

const fullProject = {
  id: 'project-1',
  name: 'Project One',
  code: 'P-001',
  documentCount: 0,
  pendingCount: 0,
  type: 'client' as const,
  status: 'active' as const,
  description: undefined,
  clientId: 'client-1',
  client: { id: 'client-1', name: 'Archived client', archivedAt: '2026-01-01T00:00:00.000Z' },
  address: undefined,
  startDate: undefined,
  endDate: undefined,
  budget: undefined,
  currency: 'EUR' as const,
  manager: undefined,
  image: null,
  color: undefined,
};

describe('SettingsSection', () => {
  beforeEach(() => {
    vi.mocked(useQuery).mockReturnValue({ data: fullProject, isPending: false, isError: false } as never);
    vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries: mocks.invalidateQueries } as never);
    vi.mocked(useWorkspaceAccess).mockReturnValue({ canAccess: () => true } as never);
    mocks.updateProject.mockReset();
    mocks.updateProject.mockResolvedValue(fullProject);
    mocks.invalidateQueries.mockReset();
  });

  it('shows an archived parent and omits it from an unchanged settings update', async () => {
    const user = userEvent.setup();
    render(
      <ConfigProvider>
        <ThemeModeProvider>
          <App>
            <SettingsSection
              project={{
                id: 'project-1',
                name: 'Project One',
                code: 'P-001',
                documentCount: 0,
                pendingCount: 0,
                color: 'terracotta',
              }}
              color="terracotta"
            />
          </App>
        </ThemeModeProvider>
      </ConfigProvider>,
    );

    await waitFor(() => expect(screen.getByText('El cliente actual está archivado')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(updateProject).toHaveBeenCalledWith('project-1', expect.any(Object)));
    const payload = vi.mocked(updateProject).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload.clientId).toBeUndefined();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: projectQueries.all });
  });
});
