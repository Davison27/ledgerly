import { useNavigate, useSearch } from '@tanstack/react-router';

export type ProjectDetailSection =
  | 'documents'
  | 'checklist'
  | 'equipment'
  | 'dashboard'
  | 'schedule'
  | 'settings';

export interface ProjectDetailSectionAccess {
  projects: boolean;
  documents: boolean;
  equipment: boolean;
  dashboard: boolean;
  calendar: boolean;
  planning: boolean;
}

export function getAllowedProjectDetailSections(
  access: ProjectDetailSectionAccess,
  planningEnabled: boolean,
): ProjectDetailSection[] {
  return [
    ...(access.projects && access.documents ? ['documents' as const] : []),
    ...(access.projects && planningEnabled && access.planning ? ['checklist' as const] : []),
    ...(access.projects && access.equipment ? ['equipment' as const] : []),
    ...(access.projects && access.dashboard ? ['dashboard' as const] : []),
    ...(access.projects && access.calendar ? ['schedule' as const] : []),
    ...(access.projects ? ['settings' as const] : []),
  ];
}

const PROJECT_DETAIL_SECTIONS: readonly ProjectDetailSection[] = [
  'documents',
  'checklist',
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

export function useProjectDetailSection(
  projectId: string | undefined,
  allowedSections: readonly ProjectDetailSection[] = PROJECT_DETAIL_SECTIONS,
): UseProjectDetailSectionResult {
  const search = useSearch({ strict: false }) as { section?: unknown };
  const navigate = useNavigate();

  const section: ProjectDetailSection =
    isProjectDetailSection(search.section) && allowedSections.includes(search.section)
    ? search.section
    : allowedSections[0] ?? 'documents';

  const setSection = (nextSection: ProjectDetailSection) => {
    if (!projectId || !allowedSections.includes(nextSection)) return;
    void navigate({
      to: '/projects/$projectId',
      params: { projectId },
      search: { section: nextSection },
      replace: true,
    });
  };

  return { section, setSection };
}
