import { useNavigate, useSearch } from '@tanstack/react-router';

export type ProjectDetailSection = 'documents' | 'equipment' | 'dashboard' | 'schedule' | 'settings';

const PROJECT_DETAIL_SECTIONS: readonly ProjectDetailSection[] = [
  'documents',
  'equipment',
  'dashboard',
  'schedule',
  'settings',
];

function isProjectDetailSection(value: unknown): value is ProjectDetailSection {
  return typeof value === 'string' && (PROJECT_DETAIL_SECTIONS as readonly string[]).includes(value);
}

export interface UseProjectDetailSectionResult {
  section: ProjectDetailSection;
  setSection: (section: ProjectDetailSection) => void;
}

export function useProjectDetailSection(projectId: string | undefined): UseProjectDetailSectionResult {
  const search = useSearch({ strict: false }) as { section?: unknown };
  const navigate = useNavigate();

  const section: ProjectDetailSection = isProjectDetailSection(search.section)
    ? search.section
    : 'documents';

  const setSection = (nextSection: ProjectDetailSection) => {
    if (!projectId) return;
    void navigate({
      to: '/projects/$projectId',
      params: { projectId },
      search: { section: nextSection },
      replace: true,
    });
  };

  return { section, setSection };
}
