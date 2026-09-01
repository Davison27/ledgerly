import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { AddStaffDocumentButton } from './AddStaffDocumentButton';

vi.mock('@/entities/workspace-member', () => ({ useWorkspaceAccess: vi.fn() }));

describe('AddStaffDocumentButton', () => {
  beforeEach(() => {
    vi.mocked(useWorkspaceAccess).mockReturnValue({ canAccess: () => true } as never);
  });

  it('keeps the staff document upload control visible but unavailable', () => {
    render(<AddStaffDocumentButton />);

    expect(screen.getByRole('button', { name: /Próximamente/ })).toBeDisabled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('hides the deferred control from users without staff edit access', () => {
    vi.mocked(useWorkspaceAccess).mockReturnValue({ canAccess: () => false } as never);

    render(<AddStaffDocumentButton />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
