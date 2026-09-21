import { App } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteEquipment } from '@/entities/equipment';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { EquipmentPage } from './EquipmentPage';

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn(), useQueryClient: vi.fn() }));
vi.mock('@/entities/equipment', () => ({
  createEquipment: vi.fn(),
  deleteEquipment: vi.fn(),
  unarchiveEquipment: vi.fn(),
  equipmentQueries: { list: vi.fn(), all: ['equipment'] },
  updateEquipment: vi.fn(),
}));
vi.mock('@/entities/workspace-member', () => ({ useWorkspaceAccess: vi.fn() }));
vi.mock('@/shared/ui/PageContainer', () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/shared/ui/PageHeader', () => ({
  PageHeader: ({ title }: { title: React.ReactNode }) => <header><h1>{title}</h1></header>,
}));
vi.mock('@/shared/ui/EmptyHint', () => ({ EmptyHint: () => null }));
vi.mock('../form/EquipmentFormModal', () => ({ EquipmentFormModal: () => null }));
vi.mock('../detail/EquipmentDetailModal', () => ({ EquipmentDetailModal: () => null }));
vi.mock('../card/EquipmentCard', () => ({
  EquipmentCard: ({
    equipment,
    onDelete,
  }: {
    equipment: { id: string; name: string };
    onDelete: (equipment: { id: string; name: string }) => void;
  }) => (
    <button aria-label="Eliminar equipo" onClick={() => void onDelete(equipment)}>
      {equipment.name}
    </button>
  ),
}));

describe('EquipmentPage', () => {
  beforeEach(() => {
    vi.mocked(useQueryClient).mockReturnValue({
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    } as never);
    vi.mocked(useWorkspaceAccess).mockReturnValue({ canAccess: () => true } as never);
    vi.mocked(useQuery).mockReturnValue({
      isPending: false,
      isError: false,
      data: [{
        id: 'e-1',
        name: 'Equipo Uno',
        price: null,
        stock: 1,
        reference: null,
        category: null,
        brand: null,
        description: null,
        image: null,
        tags: [],
        leasingMonthlyFee: null,
      }],
    } as never);
  });

  it('shows the archived toast when deletion archives equipment', async () => {
    const user = userEvent.setup();
    vi.mocked(deleteEquipment).mockResolvedValue({ outcome: 'archived' });

    render(
      <App>
        <EquipmentPage />
      </App>,
    );

    await user.click(screen.getByRole('button', { name: 'Eliminar equipo' }));

    await waitFor(() => {
      expect(screen.getByText('Equipo archivado')).toBeInTheDocument();
    });
  });
});
