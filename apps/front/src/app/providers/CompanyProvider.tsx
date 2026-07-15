import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  addProject as addProjectApi,
  fetchCompany,
  fetchProjects,
  removeProject as removeProjectApi,
  updateCompany as updateCompanyApi,
  type Company,
  type Project,
  type ProjectFormValues,
} from '../../data/company';

const EMPTY_COMPANY: Company = { id: '', name: '' };

interface CompanyContextValue {
  company: Company;
  companyLoading: boolean;
  projects: Project[];
  projectsLoading: boolean;
  updateCompany: (patch: Partial<Omit<Company, 'id'>>) => Promise<void>;
  addProject: (values: ProjectFormValues) => Promise<void>;
  removeProject: (projectId: string) => Promise<void>;
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
  const [company, setCompany] = useState<Company>(EMPTY_COMPANY);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const reloadProjects = useCallback(async () => {
    const loaded = await fetchProjects();
    setProjects(loaded);
  }, []);

  useEffect(() => {
    let cancelled = false;

    setCompanyLoading(true);
    fetchCompany()
      .then((loaded) => {
        if (!cancelled) setCompany(loaded);
      })
      .catch(() => {
        if (!cancelled) setCompany(EMPTY_COMPANY);
      })
      .finally(() => {
        if (!cancelled) setCompanyLoading(false);
      });

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

  const updateCompany = useCallback(async (patch: Partial<Omit<Company, 'id'>>) => {
    const updated = await updateCompanyApi(patch);
    setCompany(updated);
  }, []);

  const addProject = useCallback(
    async (values: ProjectFormValues) => {
      await addProjectApi(values);
      // Refetch from the backend so documentCount/pendingCount stay authoritative.
      await reloadProjects();
    },
    [reloadProjects],
  );

  const removeProject = useCallback(async (projectId: string) => {
    await removeProjectApi(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  }, []);

  const value = useMemo<CompanyContextValue>(
    () => ({
      company,
      companyLoading,
      projects,
      projectsLoading,
      updateCompany,
      addProject,
      removeProject,
    }),
    [company, companyLoading, projects, projectsLoading, updateCompany, addProject, removeProject],
  );

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}
