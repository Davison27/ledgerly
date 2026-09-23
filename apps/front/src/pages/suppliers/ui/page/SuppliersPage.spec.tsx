import { App } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteSupplier } from '@/entities/supplier';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { SuppliersPage } from './SuppliersPage';

const accessMocks = vi.hoisted(() => ({ documents: 'view' as string }));

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn(), useQueryClient: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/documents">{children}</a>,
}));
vi.mock('@/entities/supplier', () => ({
  createSupplier: vi.fn(),
  deleteSupplier: vi.fn(),
  unarchiveSupplier: vi.fn(),
  supplierQueries: { list: vi.fn(), all: ['suppliers'] },
  updateSupplier: vi.fn(),
}));
vi.mock('@/entities/workspace-member', () => ({ useWorkspaceAccess: vi.fn() }));
vi.mock('@/shared/ui/PageContainer', () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/shared/ui/PageHeader', () => ({
  PageHeader: ({ title }: { title: React.ReactNode }) => <header><h1>{title}</h1></header>,
}));
vi.mock('@/shared/ui/EmptyHint', () => ({ EmptyHint: () => null }));
vi.mock('@/shared/ui/TableSurface', () => ({
  TableSurface: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}));
vi.mock('../form/SupplierFormModal', () => ({ SupplierFormModal: () => null }));

describe('SuppliersPage', () => {
  beforeEach(() => {
    accessMocks.documents = 'view';
    vi.mocked(useQueryClient).mockReturnValue({
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    } as never);
    vi.mocked(useWorkspaceAccess).mockReturnValue({
      canAccess: (module: string) => module === 'suppliers' || accessMocks.documents === 'view',
    } as never);
    vi.mocked(useQuery).mockReturnValue({
      isPending: false,
      isError: false,
      data: [{
        id: 's-1',
        name: 'Proveedor Uno',
        taxId: null,
        email: null,
        phone: null,
        documentCount: 2,
        spend: [],
      }],
    } as never);
  });

  it('shows document-derived columns and document links with Documents view', () => {
    render(
      <App>
        <SuppliersPage />
      </App>,
    );

    expect(screen.getByRole('columnheader', { name: 'Documentos' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Gasto total' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '2' })).toHaveAttribute('href', '/documents');
  });

  it('omits document-derived data and links without Documents view', () => {
    accessMocks.documents = 'none';
    vi.mocked(useQuery).mockReturnValue({
      isPending: false,
      isError: false,
      data: [{
        id: 's-1',
        name: 'Proveedor Uno',
        taxId: null,
        email: null,
        phone: null,
      }],
    } as never);

    render(
      <App>
        <SuppliersPage />
      </App>,
    );

    expect(screen.queryByRole('columnheader', { name: 'Documentos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Gasto total' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows the archived toast when deletion archives a supplier', async () => {
    const user = userEvent.setup();
    vi.mocked(deleteSupplier).mockResolvedValue({ outcome: 'archived' });

    render(
      <App>
        <SuppliersPage />
      </App>,
    );

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    const confirmationButtons = await screen.findAllByRole('button', { name: 'Eliminar' });
    await user.click(confirmationButtons.at(-1)!);

    await waitFor(() => {
      expect(screen.getByText('Proveedor archivado')).toBeInTheDocument();
    });
  });
});
