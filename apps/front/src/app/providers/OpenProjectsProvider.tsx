import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface OpenProjectsState {
  open: Record<string, string[]>;
  active: Record<string, string | undefined>;
}

interface OpenProjectsContextValue {
  getOpen: (enterpriseId: string) => string[];
  isOpen: (enterpriseId: string, projectId: string) => boolean;
  getActive: (enterpriseId: string) => string | undefined;
  openProject: (enterpriseId: string, projectId: string) => void;
  closeProject: (enterpriseId: string, projectId: string) => void;
  setActive: (enterpriseId: string, projectId: string) => void;
}

const OpenProjectsContext = createContext<OpenProjectsContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useOpenProjects(): OpenProjectsContextValue {
  const ctx = useContext(OpenProjectsContext);
  if (!ctx) {
    throw new Error('useOpenProjects debe usarse dentro de OpenProjectsProvider');
  }
  return ctx;
}

export function OpenProjectsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OpenProjectsState>({ open: {}, active: {} });

  const openProject = useCallback((enterpriseId: string, projectId: string) => {
    setState((s) => {
      const list = s.open[enterpriseId] ?? [];
      const open = list.includes(projectId)
        ? s.open
        : { ...s.open, [enterpriseId]: [...list, projectId] };
      return { open, active: { ...s.active, [enterpriseId]: projectId } };
    });
  }, []);

  const closeProject = useCallback((enterpriseId: string, projectId: string) => {
    setState((s) => {
      const list = s.open[enterpriseId] ?? [];
      if (!list.includes(projectId)) return s;
      const idx = list.indexOf(projectId);
      const nextList = list.filter((id) => id !== projectId);
      const open = { ...s.open, [enterpriseId]: nextList };
      let active = s.active;
      if (s.active[enterpriseId] === projectId) {
        const neighbor = nextList[idx] ?? nextList[idx - 1];
        active = { ...s.active, [enterpriseId]: neighbor };
      }
      return { open, active };
    });
  }, []);

  const setActive = useCallback((enterpriseId: string, projectId: string) => {
    setState((s) => ({ ...s, active: { ...s.active, [enterpriseId]: projectId } }));
  }, []);

  const value = useMemo<OpenProjectsContextValue>(
    () => ({
      getOpen: (enterpriseId) => state.open[enterpriseId] ?? [],
      isOpen: (enterpriseId, projectId) =>
        (state.open[enterpriseId] ?? []).includes(projectId),
      getActive: (enterpriseId) => state.active[enterpriseId],
      openProject,
      closeProject,
      setActive,
    }),
    [state, openProject, closeProject, setActive],
  );

  return (
    <OpenProjectsContext.Provider value={value}>
      {children}
    </OpenProjectsContext.Provider>
  );
}
