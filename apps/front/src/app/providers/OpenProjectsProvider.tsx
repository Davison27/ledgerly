import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface OpenProjectsState {
  open: string[];
  active: string | undefined;
}

interface OpenProjectsContextValue {
  getOpen: () => string[];
  isOpen: (projectId: string) => boolean;
  getActive: () => string | undefined;
  openProject: (projectId: string) => void;
  closeProject: (projectId: string) => void;
  setActive: (projectId: string) => void;
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
  const [state, setState] = useState<OpenProjectsState>({
    open: [],
    active: undefined,
  });

  const openProject = useCallback((projectId: string) => {
    setState((s) => {
      const open = s.open.includes(projectId)
        ? s.open
        : [...s.open, projectId];
      return { open, active: projectId };
    });
  }, []);

  const closeProject = useCallback((projectId: string) => {
    setState((s) => {
      if (!s.open.includes(projectId)) return s;
      const idx = s.open.indexOf(projectId);
      const open = s.open.filter((id) => id !== projectId);
      let active = s.active;
      if (s.active === projectId) {
        active = open[idx] ?? open[idx - 1];
      }
      return { open, active };
    });
  }, []);

  const setActive = useCallback((projectId: string) => {
    setState((s) => ({ ...s, active: projectId }));
  }, []);

  const value = useMemo<OpenProjectsContextValue>(
    () => ({
      getOpen: () => state.open,
      isOpen: (projectId) => state.open.includes(projectId),
      getActive: () => state.active,
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
