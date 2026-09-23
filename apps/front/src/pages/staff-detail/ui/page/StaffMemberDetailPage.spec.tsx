import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { StaffMemberDetailPage } from './StaffMemberDetailPage';

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return { ...actual, useQuery: vi.fn() };
});
vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(),
  useParams: vi.fn(),
  useSearch: vi.fn(),
}));
vi.mock('@/entities/workspace-member', () => ({ useWorkspaceAccess: vi.fn() }));
vi.mock('../profile/ProfileSection', () => ({
  ProfileSection: ({ staffMember }: { staffMember: { firstName: string } }) => (
    <div>Profile: {staffMember.firstName}</div>
  ),
}));
vi.mock('../documents/StaffDocumentsSection', () => ({
  StaffDocumentsSection: () => <div>Staff documents</div>,
}));
vi.mock('../payrolls/PayrollsSection', () => ({ PayrollsSection: () => <div>Payrolls</div> }));
vi.mock('../agenda/AgendaSection', () => ({ AgendaSection: () => <div>Staff schedule</div> }));

describe('StaffMemberDetailPage', () => {
  const staffMember = {
    id: 'staff-1',
    firstName: 'Riley',
    lastName: 'Jones',
    position: 'Technician',
    taxId: null,
    email: null,
    phone: null,
    hireDate: null,
    endDate: null,
    notes: null,
  };

  beforeEach(() => {
    vi.mocked(useNavigate).mockReturnValue(vi.fn() as never);
    vi.mocked(useParams).mockReturnValue({ staffMemberId: 'staff-1' } as never);
    vi.mocked(useSearch).mockReturnValue({ section: 'documents' } as never);
    vi.mocked(useWorkspaceAccess).mockReturnValue({
      canAccess: (module: string) => module === 'staff',
    } as never);
    vi.mocked(useQuery).mockImplementation((options) => {
      const queryKey = (options as { queryKey?: unknown[] }).queryKey;
      return {
        data: queryKey?.[1] === 'detail' ? staffMember : [],
        isPending: false,
        isError: false,
      } as never;
    });
  });

  it('falls back to profile and skips document or schedule reads when only Staff view is granted', () => {
    render(<StaffMemberDetailPage />);

    expect(screen.getByText('Profile: Riley')).toBeInTheDocument();
    expect(screen.queryByText('Staff documents')).not.toBeInTheDocument();
    expect(screen.queryByText('Payrolls')).not.toBeInTheDocument();
    expect(screen.queryByText('Staff schedule')).not.toBeInTheDocument();
    expect(vi.mocked(useQuery).mock.calls).toEqual(
      expect.arrayContaining([
        [expect.objectContaining({ queryKey: ['staff', 'detail', 'staff-1'], enabled: true })],
        [expect.objectContaining({ queryKey: ['staff-document-types'], enabled: false })],
        [
          expect.objectContaining({
            queryKey: ['staff', 'documents', 'staff-1', null],
            enabled: false,
          }),
        ],
      ]),
    );
  });

  it('hides the schedule when Projects view is denied', () => {
    vi.mocked(useSearch).mockReturnValue({ section: 'schedule' } as never);
    vi.mocked(useWorkspaceAccess).mockReturnValue({
      canAccess: (module: string) => ['staff', 'calendar'].includes(module),
    } as never);

    render(<StaffMemberDetailPage />);

    expect(screen.getByText('Profile: Riley')).toBeInTheDocument();
    expect(screen.queryByText('Staff schedule')).not.toBeInTheDocument();
  });
});
