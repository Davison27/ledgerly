import { useNavigate, useSearch } from '@tanstack/react-router';

export type StaffDetailSection = 'documents' | 'payrolls' | 'schedule' | 'profile';

const STAFF_DETAIL_SECTIONS: readonly StaffDetailSection[] = ['documents', 'payrolls', 'schedule', 'profile'];

function isStaffDetailSection(value: unknown): value is StaffDetailSection {
  return typeof value === 'string' && (STAFF_DETAIL_SECTIONS as readonly string[]).includes(value);
}

export interface UseStaffDetailSectionResult {
  section: StaffDetailSection;
  setSection: (section: StaffDetailSection) => void;
}

export function useStaffDetailSection(
  staffMemberId: string | undefined,
  allowedSections: readonly StaffDetailSection[] = STAFF_DETAIL_SECTIONS,
): UseStaffDetailSectionResult {
  const search = useSearch({ strict: false }) as { section?: unknown };
  const navigate = useNavigate();

  const section: StaffDetailSection =
    isStaffDetailSection(search.section) && allowedSections.includes(search.section)
    ? search.section
    : allowedSections[0] ?? 'profile';

  const setSection = (nextSection: StaffDetailSection) => {
    if (!staffMemberId || !allowedSections.includes(nextSection)) return;
    void navigate({
      to: '/staff/$staffMemberId',
      params: { staffMemberId },
      search: { section: nextSection },
      replace: true,
    });
  };

  return { section, setSection };
}
