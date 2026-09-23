import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import type { StaffMemberDto } from '@/entities/staff-member';
import { AgendaSection } from './AgendaSection';

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return { ...actual, useQuery: vi.fn() };
});
vi.mock('@tanstack/react-router', () => ({ useNavigate: vi.fn() }));
vi.mock('@/entities/workspace-member', () => ({ useWorkspaceAccess: vi.fn() }));

describe('AgendaSection', () => {
  beforeEach(() => {
    vi.mocked(useNavigate).mockReturnValue(vi.fn() as never);
    vi.mocked(useQuery).mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    } as never);
  });

  it('does not request or render the schedule without Projects view', () => {
    vi.mocked(useWorkspaceAccess).mockReturnValue({
      canAccess: (module: string) => ['staff', 'calendar'].includes(module),
    } as never);

    const { container } = render(
      <AgendaSection staffMember={{ id: 'staff-1' } as StaffMemberDto} />,
    );

    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    expect(container).toBeEmptyDOMElement();
  });
});
