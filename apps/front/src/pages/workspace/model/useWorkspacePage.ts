import { useNavigate, useSearch } from '@tanstack/react-router';

export type WorkspaceTab = 'company' | 'members' | 'integrations';

const WORKSPACE_TABS: readonly WorkspaceTab[] = ['company', 'members', 'integrations'];

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
    const options = { to: '/workspace', search: { tab: nextTab }, replace: true };
    void navigate(options as unknown as Parameters<typeof navigate>[0]);
  };

  return { tab, setTab };
}
