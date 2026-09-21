import { App } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteStaffMember } from '@/entities/staff-member';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { StaffPage } from './StaffPage';

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn(), useQueryClient: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/staff">{children}</a>,
}));
vi.mock('@/entities/staff-member', () => ({
  createStaffMember: vi.fn(),
  deleteStaffMember: vi.fn(),
  unarchiveStaffMember: vi.fn(),
  staffQueries: { list: vi.fn(), all: ['staff'] },
  updateStaffMember: vi.fn(),
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
vi.mock('@/shared/ui/SemanticTag', () => ({
  SemanticTag: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
vi.mock('@/features/staff-member-form', () => ({ StaffMemberFormModal: () => null }));

describe('StaffPage', () => {
  beforeEach(() => {
    vi.mocked(useQueryClient).mockReturnValue({
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    } as never);
    vi.mocked(useWorkspaceAccess).mockReturnValue({ canAccess: () => true } as never);
    vi.mocked(useQuery).mockReturnValue({
      isPending: false,
      isError: false,
      data: [{
        id: 'm-1',
        firstName: 'Persona',
        lastName: 'Uno',
        taxId: null,
        position: null,
        endDate: null,
        documentCount: 0,
        documentStatus: 'none',
        earliestExpiryDate: null,
      }],
    } as never);
  });

  it('shows the archived toast when deletion archives a staff member', async () => {
    const user = userEvent.setup();
    vi.mocked(deleteStaffMember).mockResolvedValue({ outcome: 'archived' });

    render(
      <App>
        <StaffPage />
      </App>,
    );

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    const confirmationButtons = await screen.findAllByRole('button', { name: 'Eliminar' });
    await user.click(confirmationButtons.at(-1)!);
    await waitFor(() => {
      expect(deleteStaffMember).toHaveBeenCalledWith('m-1');
    });

    await waitFor(() => {
      expect(screen.getByText('Trabajador archivado')).toBeInTheDocument();
    });
  });
});
