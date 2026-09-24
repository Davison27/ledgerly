import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { emptyMatrix } from '@/entities/workspace-member';
import { PermissionMatrix } from './PermissionMatrix';

describe('PermissionMatrix', () => {
  it('lets administrators choose planning access', () => {
    const onChange = vi.fn();
    render(<PermissionMatrix value={emptyMatrix()} onChange={onChange} />);

    const planningAccess = screen.getByRole('radiogroup', { name: 'Permiso para Planificación' });
    fireEvent.click(within(planningAccess).getByRole('radio', { name: 'Editar' }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ planning: 'edit' }));
  });
});
