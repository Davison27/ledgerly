import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkDuplicatePage,
  documentFileUrl,
  listAllDocumentsPage,
  extractInvoice,
  listDocumentsPage,
} from './document/api/documents.api';
import { createProject, updateProject } from './project/api/projects.api';
import { getScheduleBoard, listScheduleEvents } from './schedule-event/api/schedule.api';
import { listNotifications, markNotificationRead } from './notification/api/notifications.api';
import { getCompanyDashboard } from '@/pages/dashboard/api/dashboard.api';
import {
  listTaxDeadlines,
  listTaxObligations,
  listTaxSourceStates,
} from './tax-compliance/api/tax-compliance.api';
import {
  addProjectChecklistItem,
  createProjectChecklistTemplate,
  deleteProjectChecklistItem,
  deleteProjectChecklistTemplate,
  getProjectChecklist,
  getProjectChecklistTemplate,
  listProjectChecklistTemplates,
  updateProjectChecklistItem,
  updateProjectChecklistTemplate,
} from './project-checklist/api/project-checklist.api';
import { del, get, patch, post, put } from '@/shared/api/httpClient';

vi.mock('@/shared/api/httpClient', () => ({
  API_URL: 'https://api.ledgerly.test',
  ApiError: class ApiError extends Error {
    status: number;
    body: unknown;

    constructor(status: number, body: unknown, message?: string) {
      super(message);
      this.status = status;
      this.body = body;
    }
  },
  buildQueryString: vi.fn((params: Record<string, unknown>) => {
    const entries = Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    );
    return entries.length
      ? `?${new URLSearchParams(entries as [string, string][]).toString()}`
      : '';
  }),
  del: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}));

describe('frontend API contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(get).mockResolvedValue({} as never);
    vi.mocked(post).mockResolvedValue({} as never);
    vi.mocked(patch).mockResolvedValue({} as never);
    vi.mocked(del).mockResolvedValue(undefined);
    vi.mocked(put).mockResolvedValue({} as never);
  });

  it('serializes document filters, pagination and duplicate checks into backend routes', async () => {
    await listDocumentsPage('project-1', { search: 'Acme', amountMin: 0 }, 2, 50);
    await listAllDocumentsPage(
      { clientId: 'client-1', projectId: 'project-1', supplierId: 'supplier-1' },
      2,
      50,
    );
    await checkDuplicatePage({ invoiceNumber: 'INV-42', amount: 123.45 }, 3, 10);

    expect(get).toHaveBeenNthCalledWith(
      1,
      '/projects/project-1/documents?search=Acme&amountMin=0&page=2&size=50',
    );
    expect(get).toHaveBeenNthCalledWith(
      2,
      '/documents?projectId=project-1&clientId=client-1&supplierId=supplier-1&page=2&size=50',
    );
    expect(get).toHaveBeenNthCalledWith(
      3,
      '/documents/duplicate-check?invoiceNumber=INV-42&amount=123.45&page=3&size=10',
    );
    expect(documentFileUrl('project-1', 'document-1')).toBe(
      'https://api.ledgerly.test/projects/project-1/documents/document-1/file',
    );
  });

  it('sends project mutations through the expected HTTP verbs and routes', async () => {
    await createProject({ name: 'Project One', code: 'P-001', type: 'client', clientId: 'client-1' });
    await updateProject('project-1', { name: 'Updated', image: null });

    expect(post).toHaveBeenCalledWith('/projects', {
      name: 'Project One',
      code: 'P-001',
      type: 'client',
      clientId: 'client-1',
    });
    expect(patch).toHaveBeenCalledWith('/projects/project-1', { name: 'Updated', image: null });
  });

  it('builds schedule and notification list routes with query parameters', async () => {
    await getScheduleBoard('2026-08-01', '2026-08-31');
    await listScheduleEvents({ projectId: 'project-1', staffMemberId: 'staff-1' });
    await listNotifications({ page: 2, size: 25, status: 'unread' });
    await markNotificationRead('notification-1');

    expect(get).toHaveBeenNthCalledWith(1, '/schedule/board?from=2026-08-01&to=2026-08-31');
    expect(get).toHaveBeenNthCalledWith(
      2,
      '/schedule/events?projectId=project-1&staffMemberId=staff-1',
    );
    expect(get).toHaveBeenNthCalledWith(3, '/notifications?page=2&size=25&status=unread');
    expect(post).toHaveBeenCalledWith('/notifications/notification-1/read');
  });

  it('uses the date-derived dashboard year query independently of project payloads', async () => {
    await getCompanyDashboard();
    await getCompanyDashboard(2025);

    expect(get).toHaveBeenNthCalledWith(1, '/dashboard');
    expect(get).toHaveBeenNthCalledWith(2, '/dashboard?year=2025');
  });

  it('uses the stable tax compliance catalog, calendar and source routes', async () => {
    await listTaxObligations();
    await listTaxDeadlines('2026-01-01', '2026-12-31');
    await listTaxSourceStates();

    expect(get).toHaveBeenNthCalledWith(1, '/tax-compliance/catalog');
    expect(get).toHaveBeenNthCalledWith(
      2,
      '/tax-compliance/calendar?from=2026-01-01&to=2026-12-31',
    );
    expect(get).toHaveBeenNthCalledWith(3, '/tax-compliance/sources');
  });

  it('maps checklist templates and uses the template and project checklist routes', async () => {
    const template = {
      id: 'template-1',
      name: 'Opening',
      items: [
        { id: 'item-2', text: 'Second', position: 1 },
        { id: 'item-1', text: 'First', position: 0 },
      ],
    };
    const checklist = {
      projectId: 'project-1',
      name: 'Opening',
      items: [{ id: 'item-1', text: 'First', position: 0, completed: false }],
    };
    vi.mocked(get)
      .mockResolvedValueOnce([template] as never)
      .mockResolvedValueOnce(template as never)
      .mockResolvedValueOnce(checklist as never);
    vi.mocked(post)
      .mockResolvedValueOnce(template as never)
      .mockResolvedValueOnce(checklist as never);
    vi.mocked(put).mockResolvedValueOnce(template as never);
    vi.mocked(patch).mockResolvedValueOnce(checklist as never);

    const templates = await listProjectChecklistTemplates();
    await getProjectChecklistTemplate('template-1');
    await createProjectChecklistTemplate({ name: 'Closing', items: ['Lock up'] });
    await updateProjectChecklistTemplate('template-1', { name: 'Opening', items: ['Check'] });
    await deleteProjectChecklistTemplate('template-1');
    await getProjectChecklist('project-1');
    await addProjectChecklistItem('project-1', 'Check the site');
    await updateProjectChecklistItem('project-1', 'item-1', { completed: true, position: 2 });
    await deleteProjectChecklistItem('project-1', 'item-1');

    expect(templates[0]?.items.map(({ text }) => text)).toEqual(['First', 'Second']);
    expect(get).toHaveBeenNthCalledWith(1, '/project-checklist-templates');
    expect(get).toHaveBeenNthCalledWith(2, '/project-checklist-templates/template-1');
    expect(post).toHaveBeenCalledWith('/project-checklist-templates', {
      name: 'Closing',
      items: ['Lock up'],
    });
    expect(put).toHaveBeenCalledWith('/project-checklist-templates/template-1', {
      name: 'Opening',
      items: ['Check'],
    });
    expect(del).toHaveBeenCalledWith('/project-checklist-templates/template-1');
    expect(get).toHaveBeenNthCalledWith(3, '/projects/project-1/checklist');
    expect(post).toHaveBeenCalledWith('/projects/project-1/checklist/items', { text: 'Check the site' });
    expect(patch).toHaveBeenCalledWith('/projects/project-1/checklist/items/item-1', {
      completed: true,
      position: 2,
    });
    expect(del).toHaveBeenCalledWith('/projects/project-1/checklist/items/item-1');
  });

  it('uploads invoice extraction with credentials, CSRF, progress and upload completion reporting', async () => {
    const progress = vi.fn();
    const events: string[] = [];
    const uploadComplete = vi.fn(() => events.push('uploadComplete'));
    const result = { source: 'heuristic', confidence: 'high', fields: {}, warnings: [] };

    class FakeXmlHttpRequest {
      static last: FakeXmlHttpRequest;
      readonly upload: {
        onprogress?: (event: ProgressEvent) => void;
        onload?: () => void;
      } = {};
      readonly open = vi.fn();
      readonly setRequestHeader = vi.fn();
      readonly send = vi.fn((body: FormData) => {
        void body;
        this.upload.onprogress?.({
          lengthComputable: true,
          loaded: 50,
          total: 100,
        } as ProgressEvent);
        this.upload.onload?.();
        events.push('response');
        this.status = 200;
        this.responseText = JSON.stringify(result);
        this.onload?.();
      });
      responseType = '';
      responseText = '';
      status = 0;
      withCredentials = false;
      onload?: () => void;
      onerror?: () => void;

      constructor() {
        FakeXmlHttpRequest.last = this;
      }
    }

    document.cookie = 'lg_csrf=csrf-token';
    vi.stubGlobal('XMLHttpRequest', FakeXmlHttpRequest);

    await expect(
      extractInvoice('project-1', new File(['pdf'], 'invoice.pdf'), progress, uploadComplete),
    ).resolves.toEqual(result);

    expect(FakeXmlHttpRequest.last.open).toHaveBeenCalledWith(
      'POST',
      'https://api.ledgerly.test/projects/project-1/documents/extract',
    );
    expect(FakeXmlHttpRequest.last.withCredentials).toBe(true);
    expect(FakeXmlHttpRequest.last.setRequestHeader).toHaveBeenCalledWith(
      'X-CSRF-Token',
      'csrf-token',
    );
    expect(FakeXmlHttpRequest.last.send).toHaveBeenCalledWith(expect.any(FormData));
    const submittedFormData = FakeXmlHttpRequest.last.send.mock.calls[0]?.[0] as FormData;
    expect(submittedFormData.get('file')).toBeInstanceOf(File);
    expect(progress).toHaveBeenCalledWith(50);
    expect(uploadComplete).toHaveBeenCalledOnce();
    expect(events).toEqual(['uploadComplete', 'response']);
  });

  it('returns malformed non-success responses as ApiError values', async () => {
    class ErrorXmlHttpRequest {
      readonly upload: { onprogress?: (event: ProgressEvent) => void; onload?: () => void } = {};
      readonly open = vi.fn();
      readonly setRequestHeader = vi.fn();
      readonly send = vi.fn(() => {
        this.status = 422;
        this.responseText = 'invalid response';
        this.onload?.();
      });
      responseType = '';
      responseText = '';
      status = 0;
      withCredentials = false;
      onload?: () => void;
      onerror?: () => void;
    }

    vi.stubGlobal('XMLHttpRequest', ErrorXmlHttpRequest);

    await expect(
      extractInvoice('project-1', new File(['pdf'], 'invoice.pdf')),
    ).rejects.toMatchObject({ status: 422, body: 'invalid response' });
  });

  it('rejects network failures and ignores non-computable progress events', async () => {
    const progress = vi.fn();

    class NetworkXmlHttpRequest {
      readonly upload: { onprogress?: (event: ProgressEvent) => void; onload?: () => void } = {};
      readonly open = vi.fn();
      readonly setRequestHeader = vi.fn();
      readonly send = vi.fn(() => {
        this.upload.onprogress?.({
          lengthComputable: false,
          loaded: 50,
          total: 0,
        } as ProgressEvent);
        this.onerror?.();
      });
      responseType = '';
      responseText = '';
      status = 0;
      withCredentials = false;
      onload?: () => void;
      onerror?: () => void;
    }

    vi.stubGlobal('XMLHttpRequest', NetworkXmlHttpRequest);

    await expect(
      extractInvoice('project-1', new File(['pdf'], 'invoice.pdf'), progress),
    ).rejects.toMatchObject({ status: 0, message: 'Network error' });
    expect(progress).not.toHaveBeenCalled();
  });
});
