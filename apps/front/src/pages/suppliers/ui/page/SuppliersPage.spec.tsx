import { App } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteSupplier } from '@/entities/supplier';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { SuppliersPage } from './SuppliersPage';

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
    vi.mocked(useQueryClient).mockReturnValue({
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    } as never);
    vi.mocked(useWorkspaceAccess).mockReturnValue({ canAccess: () => true } as never);
    vi.mocked(useQuery).mockReturnValue({
      isPending: false,
      isError: false,
      data: [{
        id: 's-1',
        name: 'Proveedor Uno',
        taxId: null,
        email: null,
        phone: null,
        documentCount: 0,
        spend: [],
      }],
    } as never);
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
