import { App } from 'antd';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { Project } from '@/entities/project';
import { ProjectCard } from './ProjectCard';

const mocks = vi.hoisted(() => ({
  allowedPermissions: [] as string[],
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

vi.mock('@/entities/workspace-member', () => ({
  useWorkspaceAccess: () => ({
    canAccess: (module: string, action: string) => mocks.allowedPermissions.includes(`${module}:${action}`),
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
    mocks.allowedPermissions = ['documents:view', 'equipment:view'];
  });

  it('hides document counts and financials without Documents view', () => {
    mocks.allowedPermissions = ['equipment:view'];
    const { container } = renderCard();

    expect(container).not.toHaveTextContent('4 documentos');
    expect(screen.queryByText('Beneficio neto')).not.toBeInTheDocument();
    expect(screen.queryByText('Ingresos')).not.toBeInTheDocument();
    expect(screen.queryByText('Gastos')).not.toBeInTheDocument();
    expect(screen.queryByText('Margen')).not.toBeInTheDocument();
  });

  it('shows document counts but hides financials without Equipment view', () => {
    mocks.allowedPermissions = ['documents:view'];
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

  it('shows checklist progress only when returned counts and Planning view access are present', () => {
    mocks.allowedPermissions = ['planning:view'];
    const { rerender } = renderCard({
      checklistCompletedCount: 1,
      checklistTotalCount: 2,
    });

    expect(screen.getByText('1 de 2 completados')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '1 de 2 completados' })).toHaveAttribute('aria-valuenow', '50');

    rerender(
      <App>
        <ProjectCard
          project={{ ...project, checklistCompletedCount: undefined, checklistTotalCount: undefined }}
          color="#1677ff"
          canEdit={false}
          onOpen={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onUnarchive={vi.fn()}
        />
      </App>,
    );

    expect(screen.queryByText('1 de 2 completados')).not.toBeInTheDocument();

    mocks.allowedPermissions = [];
    rerender(
      <App>
        <ProjectCard
          project={{ ...project, checklistCompletedCount: 1, checklistTotalCount: 2 }}
          color="#1677ff"
          canEdit={false}
          onOpen={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onUnarchive={vi.fn()}
        />
      </App>,
    );

    expect(screen.queryByText('1 de 2 completados')).not.toBeInTheDocument();
  });

  it('renders empty checklist progress as zero without dividing by zero', () => {
    mocks.allowedPermissions = ['planning:view'];
    renderCard({ checklistCompletedCount: 0, checklistTotalCount: 0 });

    expect(screen.getByText('0 de 0 completados')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '0 de 0 completados' })).toHaveAttribute('aria-valuenow', '0');
  });
});
