import { useNavigate, useSearch } from '@tanstack/react-router';

export type StaffDetailSection = 'documents' | 'payrolls' | 'schedule';

const STAFF_DETAIL_SECTIONS: readonly StaffDetailSection[] = ['documents', 'payrolls', 'schedule'];

function isStaffDetailSection(value: unknown): value is StaffDetailSection {
  return typeof value === 'string' && (STAFF_DETAIL_SECTIONS as readonly string[]).includes(value);
}

export interface UseStaffDetailSectionResult {
  section: StaffDetailSection;
  setSection: (section: StaffDetailSection) => void;
}

export function useStaffDetailSection(staffMemberId: string | undefined): UseStaffDetailSectionResult {
  const search = useSearch({ strict: false }) as { section?: unknown };
  const navigate = useNavigate();

  const section: StaffDetailSection = isStaffDetailSection(search.section)
    ? search.section
    : 'documents';

  const setSection = (nextSection: StaffDetailSection) => {
    if (!staffMemberId) return;
    void navigate({
      to: '/staff/$staffMemberId',
      params: { staffMemberId },
      search: { section: nextSection },
      replace: true,
    });
  };

  return { section, setSection };
}
