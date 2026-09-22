import { App } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { clientQueries } from '@/entities/client';
import { projectQueries } from '@/entities/project';
import { supplierQueries } from '@/entities/supplier';
import { DocumentsPage } from './DocumentsPage';

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return { ...actual, useQuery: vi.fn(), useQueryClient: vi.fn() };
});
vi.mock('@tanstack/react-router', () => ({ useNavigate: vi.fn(), useSearch: vi.fn(() => ({})) }));
vi.mock('@/entities/client', () => ({
  clientQueries: { list: vi.fn(() => ({ queryKey: ['clients', 'list'] })) },
}));
vi.mock('@/entities/project', () => ({
  projectQueries: { list: vi.fn(), all: ['projects'] },
}));
vi.mock('@/entities/supplier', () => ({
  supplierQueries: { list: vi.fn(() => ({ queryKey: ['suppliers', 'list'] })) },
}));
vi.mock('@/entities/document', async () => {
  const actual = await vi.importActual<typeof import('@/entities/document')>('@/entities/document');
  return {
    ...actual,
    documentQueries: actual.documentQueries,
    deleteDocument: vi.fn(),
  };
});
vi.mock('@/features/document-detail', () => ({
  DocumentDetail: () => null,
  DocumentEditModal: () => null,
}));
vi.mock('@/shared/ui/PageContainer', () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

describe('DocumentsPage', () => {
  const clients = [
    { id: 'client-1', name: 'Acme', archivedAt: null, projectCount: 1 },
    { id: 'client-2', name: 'Legacy', archivedAt: '2026-01-01T00:00:00.000Z', projectCount: 1 },
  ];
  const projects = [
    { id: 'project-1', name: 'Acme project', status: 'active' },
    { id: 'project-2', name: 'Legacy project', status: 'active' },
  ];

  beforeEach(() => {
    vi.mocked(useNavigate).mockReturnValue(vi.fn() as never);
    vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries: vi.fn() } as never);
    vi.mocked(clientQueries.list).mockReturnValue({ queryKey: ['clients', 'list'] } as never);
    vi.mocked(projectQueries.list).mockImplementation((clientId?: string) => ({
      queryKey: ['projects', 'list', clientId ?? null],
    }) as never);
    vi.mocked(supplierQueries.list).mockReturnValue({ queryKey: ['suppliers', 'list'] } as never);
    vi.mocked(useQuery).mockImplementation((options) => {
      const queryKey = (options as { queryKey?: unknown[] } | undefined)?.queryKey;
      if (queryKey?.[0] === 'clients') return { data: clients, isPending: false, isError: false } as never;
      if (queryKey?.[0] === 'projects') {
        const clientId = queryKey[2];
        return {
          data: clientId === 'client-1' ? [projects[0]] : clientId === 'client-2' ? [projects[1]] : projects,
          isPending: false,
          isError: false,
        } as never;
      }
      if (queryKey?.[0] === 'suppliers') return { data: [], isPending: false, isError: false } as never;
      if (queryKey?.[1] === 'list-page') {
        return { data: { items: [], total: 0, page: 1, size: 20 }, isPending: false, isError: false } as never;
      }
      return { data: null, isPending: false, isError: false } as never;
    });
  });

  it('loads the global project list and includes archived clients in the filter options', async () => {
    const user = userEvent.setup();

    render(
      <App>
        <DocumentsPage />
      </App>,
    );

    expect(projectQueries.list).toHaveBeenCalledWith();
    await user.click(screen.getByRole('button', { name: /Más filtros/ }));
    await user.click(screen.getAllByRole('combobox')[3]);

    expect(screen.getAllByText('Acme').length).toBeGreaterThan(0);
    expect(screen.getByText('Legacy (Archivado)')).toBeInTheDocument();
  });

  it('narrows projects when a client is selected and exposes the client chip', async () => {
    const user = userEvent.setup();

    render(
      <App>
        <DocumentsPage />
      </App>,
    );

    await user.click(screen.getByRole('button', { name: /Más filtros/ }));
    await user.click(screen.getAllByRole('combobox')[3]);
    await user.click(screen.getByText('Acme'));

    await waitFor(() => expect(projectQueries.list).toHaveBeenCalledWith('client-1'));
    expect(screen.getAllByText('Acme').length).toBeGreaterThan(0);
  });
});
