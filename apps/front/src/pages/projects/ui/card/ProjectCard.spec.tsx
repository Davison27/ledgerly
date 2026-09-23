import { App } from 'antd';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { Project } from '@/entities/project';
import { ProjectCard } from './ProjectCard';

const mocks = vi.hoisted(() => ({
  allowedModules: [] as string[],
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

vi.mock('@/entities/workspace-member', () => ({
  useWorkspaceAccess: () => ({
    canAccess: (module: string) => mocks.allowedModules.includes(module),
  }),
}));

vi.mock('@/shared/lib/useSemanticColors', () => ({
  useSemanticColors: () => ({ income: '#008000', expense: '#cc0000' }),
}));

const project: Project = {
  id: 'project-1',
  name: 'Project One',
  code: 'P-001',
  currency: 'EUR',
  financials: [{ currency: 'EUR', income: 1000, expenses: 400, profit: 600, margin: 0.6 }],
  documentCount: 4,
  pendingCount: 2,
};

function renderCard(overrides: Partial<Project> = {}) {
  return render(
    <App>
      <ProjectCard
        project={{ ...project, ...overrides }}
        color="#1677ff"
        canEdit={false}
        onOpen={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUnarchive={vi.fn()}
      />
    </App>,
  );
}

describe('ProjectCard summary access', () => {
  beforeEach(() => {
    mocks.allowedModules = ['documents', 'equipment'];
  });

  it('hides document counts and financials without Documents view', () => {
    mocks.allowedModules = ['equipment'];
    const { container } = renderCard();

    expect(container).not.toHaveTextContent('4 documentos');
    expect(screen.queryByText('Beneficio neto')).not.toBeInTheDocument();
    expect(screen.queryByText('Ingresos')).not.toBeInTheDocument();
    expect(screen.queryByText('Gastos')).not.toBeInTheDocument();
    expect(screen.queryByText('Margen')).not.toBeInTheDocument();
  });

  it('shows document counts but hides financials without Equipment view', () => {
    mocks.allowedModules = ['documents'];
    renderCard();

    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('documentos')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.queryByText('Beneficio neto')).not.toBeInTheDocument();
    expect(screen.queryByText('Ingresos')).not.toBeInTheDocument();
    expect(screen.queryByText('Gastos')).not.toBeInTheDocument();
    expect(screen.queryByText('Margen')).not.toBeInTheDocument();
  });

  it('shows financials only when Documents and Equipment are viewable', () => {
    renderCard();

    expect(screen.getByText('Beneficio neto')).toBeInTheDocument();
    expect(screen.getByText('Ingresos')).toBeInTheDocument();
    expect(screen.getByText('Gastos')).toBeInTheDocument();
    expect(screen.getByText('Margen')).toBeInTheDocument();
  });

  it('does not render omitted access-controlled summary fields', () => {
    const { container } = renderCard({
      financials: undefined,
      documentCount: undefined,
      pendingCount: undefined,
    });

    expect(container).not.toHaveTextContent('documentos');
    expect(screen.queryByText('Beneficio neto')).not.toBeInTheDocument();
    expect(screen.queryByText('Ingresos')).not.toBeInTheDocument();
  });
});
