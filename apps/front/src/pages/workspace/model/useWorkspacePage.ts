import { useNavigate, useSearch } from '@tanstack/react-router';

export type WorkspaceTab = 'company' | 'members' | 'integrations' | 'tax-compliance';

const WORKSPACE_TABS: readonly WorkspaceTab[] = [
  'company',
  'members',
  'integrations',
  'tax-compliance',
];

function isWorkspaceTab(value: unknown): value is WorkspaceTab {
  return typeof value === 'string' && (WORKSPACE_TABS as readonly string[]).includes(value);
}

export interface UseWorkspacePageResult {
  tab: WorkspaceTab;
  setTab: (tab: WorkspaceTab) => void;
}

export function useWorkspacePage(): UseWorkspacePageResult {
  const search = useSearch({ strict: false }) as { tab?: unknown };
  const navigate = useNavigate();

  const tab: WorkspaceTab = isWorkspaceTab(search.tab) ? search.tab : 'company';

  const setTab = (nextTab: WorkspaceTab) => {
    void navigate({ to: '/workspace', search: { tab: nextTab }, replace: true });
  };

  return { tab, setTab };
}
