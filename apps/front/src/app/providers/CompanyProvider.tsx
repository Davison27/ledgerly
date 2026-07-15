import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { USE_MOCKS } from '../../config';
import {
  company as initialCompany,
  fetchProjects,
  initialProjects,
  type Company,
  type Project,
  type ProjectFormValues,
} from '../../data/company';

interface CompanyContextValue {
  company: Company;
  projects: Project[];
  projectsLoading: boolean;
  updateCompany: (patch: Partial<Omit<Company, 'id'>>) => void;
  addProject: (values: ProjectFormValues) => void;
  removeProject: (projectId: string) => void;
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useCompany(): CompanyContextValue {
  const ctx = useContext(CompanyContext);
  if (!ctx) {
    throw new Error('useCompany debe usarse dentro de CompanyProvider');
  }
  return ctx;
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<Company>(initialCompany);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [projectsLoading, setProjectsLoading] = useState(!USE_MOCKS);

  useEffect(() => {
    if (USE_MOCKS) return;

    let cancelled = false;
    setProjectsLoading(true);

    fetchProjects()
      .then((loaded) => {
        if (!cancelled) setProjects(loaded);
      })
      .catch(() => {
        if (!cancelled) setProjects([]);
      })
      .finally(() => {
        if (!cancelled) setProjectsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateCompany = useCallback((patch: Partial<Omit<Company, 'id'>>) => {
    setCompany((prev) => ({ ...prev, ...patch }));
  }, []);

  const addProject = useCallback((values: ProjectFormValues) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      documentCount: 0,
      pendingCount: 0,
      ...values,
    };
    setProjects((prev) => [newProject, ...prev]);
  }, []);

  const removeProject = useCallback((projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  }, []);

  const value = useMemo<CompanyContextValue>(
    () => ({
      company,
      projects,
      projectsLoading,
      updateCompany,
      addProject,
      removeProject,
    }),
    [company, projects, projectsLoading, updateCompany, addProject, removeProject],
  );

  return (
    <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
  );
}
