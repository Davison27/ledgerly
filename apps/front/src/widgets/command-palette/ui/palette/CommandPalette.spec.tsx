import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandPalette } from './CommandPalette';

const commandPaletteMocks = vi.hoisted(() => ({
  allowedModules: [] as string[],
  navigate: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: commandPaletteMocks.useQuery,
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => commandPaletteMocks.navigate,
}));

vi.mock('antd', async () => {
  const antd = await vi.importActual<typeof import('antd')>('antd');
  return {
    ...antd,
    Modal: ({ open, children }: { open: boolean; children: ReactNode }) =>
      open ? <div role="dialog">{children}</div> : null,
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/entities/document', () => ({
  documentQueries: { list: (filters: { search?: string }) => ({ queryKey: ['documents', 'list', filters] }) },
}));

vi.mock('@/entities/project', () => ({
  projectQueries: { list: () => ({ queryKey: ['projects', 'list'] }) },
}));

vi.mock('@/entities/supplier', () => ({
  supplierQueries: { list: () => ({ queryKey: ['suppliers', 'list'] }) },
}));

vi.mock('@/entities/workspace-member', () => ({
  useWorkspaceAccess: () => ({
    canAccess: (module: string) => commandPaletteMocks.allowedModules.includes(module),
  }),
}));

const results = {
  projects: [{ id: 'project-1', name: 'Acme Project', code: 'ACME-001' }],
  suppliers: [{ id: 'supplier-1', name: 'Acme Supplier', taxId: 'ES12345678' }],
  documents: [
    {
      id: 'document-1',
      projectId: 'project-1',
      projectName: 'Acme Project',
      name: 'Acme invoice',
      amount: 100,
      currency: 'EUR',
    },
  ],
};

function searchFor(query: string): void {
  fireEvent.change(screen.getByPlaceholderText('commandPalette.placeholder'), {
    target: { value: query },
  });
  act(() => vi.advanceTimersByTime(250));
}

function enabledFor(module: string): boolean | undefined {
  const call = [...commandPaletteMocks.useQuery.mock.calls]
    .reverse()
    .find(([options]) => (options as { queryKey?: unknown[] }).queryKey?.[0] === module);

  return call?.[0]?.enabled;
}

describe('CommandPalette section access', () => {
  beforeAll(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.useFakeTimers();
    commandPaletteMocks.allowedModules = [];
    commandPaletteMocks.navigate.mockReset();
    commandPaletteMocks.useQuery.mockReset().mockImplementation((options: { queryKey?: unknown[] }) => ({
      data: results[String(options.queryKey?.[0]) as keyof typeof results],
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not query or show denied section shortcuts and cached results', () => {
    render(<CommandPalette open onClose={vi.fn()} />);

    expect(screen.queryByText('nav.companies')).not.toBeInTheDocument();
    expect(screen.queryByText('nav.dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('nav.calendar')).not.toBeInTheDocument();
    expect(screen.queryByText('nav.suppliers')).not.toBeInTheDocument();
    expect(screen.queryByText('nav.documents')).not.toBeInTheDocument();
    expect(screen.queryByText('nav.equipment')).not.toBeInTheDocument();
    expect(screen.queryByText('nav.staff')).not.toBeInTheDocument();

    searchFor('Acme');

    expect(enabledFor('projects')).toBe(false);
    expect(enabledFor('suppliers')).toBe(false);
    expect(enabledFor('documents')).toBe(false);
    expect(screen.queryByText('Acme Project')).not.toBeInTheDocument();
    expect(screen.queryByText('Acme Supplier')).not.toBeInTheDocument();
    expect(screen.queryByText('Acme invoice')).not.toBeInTheDocument();
  });

  it('requires Projects and Documents access before querying project document results', () => {
    commandPaletteMocks.allowedModules = ['documents'];
    render(<CommandPalette open onClose={vi.fn()} />);
    searchFor('Acme');

    expect(enabledFor('projects')).toBe(false);
    expect(enabledFor('documents')).toBe(false);
    expect(screen.queryByText('Acme invoice')).not.toBeInTheDocument();
  });

  it('shows and searches only sections the member can view', () => {
    commandPaletteMocks.allowedModules = [
      'dashboard',
      'projects',
      'calendar',
      'documents',
      'suppliers',
      'equipment',
      'staff',
    ];
    render(<CommandPalette open onClose={vi.fn()} />);

    expect(screen.getByText('nav.dashboard')).toBeInTheDocument();
    expect(screen.getByText('nav.companies')).toBeInTheDocument();
    expect(screen.getByText('nav.calendar')).toBeInTheDocument();
    expect(screen.getByText('nav.suppliers')).toBeInTheDocument();
    expect(screen.getByText('nav.documents')).toBeInTheDocument();
    expect(screen.getByText('nav.equipment')).toBeInTheDocument();
    expect(screen.getByText('nav.staff')).toBeInTheDocument();

    searchFor('Acme');

    expect(enabledFor('projects')).toBe(true);
    expect(enabledFor('suppliers')).toBe(true);
    expect(enabledFor('documents')).toBe(true);
    expect(screen.getByText('Acme Project')).toBeInTheDocument();
    expect(screen.getByText('Acme Supplier')).toBeInTheDocument();
    expect(screen.getByText('Acme invoice')).toBeInTheDocument();
  });
});
