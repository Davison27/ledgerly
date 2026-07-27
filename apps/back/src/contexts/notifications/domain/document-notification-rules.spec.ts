import { buildDueNotifications, buildIncompleteNotifications } from './document-notification-rules';
import { NotificationDocumentRow } from './notification-document-reader.port';

function buildRow(overrides: Partial<NotificationDocumentRow> = {}): NotificationDocumentRow {
  return {
    id: 'doc-1',
    projectId: 'project-1',
    name: 'Invoice 1',
    amount: 100,
    dueDate: '2026-07-01',
    type: 'factura',
    ...overrides,
  };
}

describe('buildDueNotifications', () => {
  it('classifies a due date before today as overdue', () => {
    const [draft] = buildDueNotifications([buildRow({ dueDate: '2026-07-01' })], '2026-07-18');

    expect(draft.type).toBe('document_overdue');
    expect(draft.severity).toBe('error');
    expect(draft.dedupeKey).toBe('document_overdue:doc-1');
  });

  it('classifies a due date on or after today as due soon', () => {
    const [draft] = buildDueNotifications([buildRow({ dueDate: '2026-07-18' })], '2026-07-18');

    expect(draft.type).toBe('document_due_soon');
    expect(draft.severity).toBe('warning');
    expect(draft.dedupeKey).toBe('document_due_soon:doc-1');
  });

  it('discards rows without a due date', () => {
    const drafts = buildDueNotifications([buildRow({ dueDate: null })], '2026-07-18');

    expect(drafts).toEqual([]);
  });

  it('carries the document as the resource and the amount in the context', () => {
    const [draft] = buildDueNotifications([buildRow()], '2026-07-18');

    expect(draft.resource).toEqual({ kind: 'document', id: 'doc-1', projectId: 'project-1' });
    expect(draft.context.amount).toBe(100);
    expect(draft.context.related).toBeNull();
  });
});

describe('buildIncompleteNotifications', () => {
  it('builds an info notification per row', () => {
    const [draft] = buildIncompleteNotifications([buildRow({ id: 'doc-2' })]);

    expect(draft.type).toBe('document_incomplete');
    expect(draft.severity).toBe('info');
    expect(draft.dedupeKey).toBe('document_incomplete:doc-2');
    expect(draft.context.date).toBeNull();
    expect(draft.resource).toEqual({ kind: 'document', id: 'doc-2', projectId: 'project-1' });
  });
});
