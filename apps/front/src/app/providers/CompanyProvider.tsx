import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  company as initialCompany,
  initialProjects,
  type Company,
  type Project,
} from '../../data/company';

interface CompanyContextValue {
  company: Company;
  projects: Project[];
  updateCompany: (patch: Partial<Omit<Company, 'id'>>) => void;
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

  const updateCompany = useCallback((patch: Partial<Omit<Company, 'id'>>) => {
    setCompany((prev) => ({ ...prev, ...patch }));
  }, []);

  const removeProject = useCallback((projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  }, []);

  const value = useMemo<CompanyContextValue>(
    () => ({ company, projects, updateCompany, removeProject }),
    [company, projects, updateCompany, removeProject],
  );

  return (
    <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
  );
}
