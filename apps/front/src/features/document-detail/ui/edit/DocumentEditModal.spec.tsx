import { App, ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectDocument } from '@/entities/document';
import { ThemeModeProvider } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { DocumentEditModal } from './DocumentEditModal';

const mocks = vi.hoisted(() => ({
  canAccess: vi.fn((module: string, level: string) => module.length > 0 && level.length > 0),
  updateDocument: vi.fn(),
}));

vi.mock('@/entities/document', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/entities/document')>()),
  updateDocument: mocks.updateDocument,
}));

vi.mock('@/entities/workspace-member', () => ({
  useWorkspaceAccess: () => ({ canAccess: mocks.canAccess }),
}));

const document: ProjectDocument = {
  id: 'document-1',
  projectId: 'project-1',
  name: 'Supplier invoice',
  type: 'invoice',
  direction: 'expense',
  month: 9,
  date: '2026-09-01',
  amount: 121,
  status: 'pending',
  rawStatus: 'pending',
  supplierId: 'supplier-1',
};

function renderModal() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <ThemeModeProvider>
          <App>
            <DocumentEditModal
              open
              document={document}
              onCancel={vi.fn()}
              onUpdated={vi.fn()}
            />
          </App>
        </ThemeModeProvider>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

describe('DocumentEditModal supplier access', () => {
  beforeEach(() => {
    mocks.canAccess.mockReset().mockImplementation((module) => module !== 'suppliers');
    mocks.updateDocument.mockReset().mockResolvedValue({
      ...document,
      currency: 'EUR',
    });
    const getComputedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => getComputedStyle(element));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('omits the existing supplier association when Suppliers view is denied', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(mocks.updateDocument).toHaveBeenCalledOnce());
    const payload = mocks.updateDocument.mock.calls[0][2] as Record<string, unknown>;

    expect(payload).not.toHaveProperty('supplierId');
  });
});
