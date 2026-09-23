import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NotificationView } from '@/entities/notification';
import { NotificationItem } from './NotificationItem';

const view: NotificationView = {
  id: 'notification-1',
  type: 'document_overdue',
  severity: 'warning',
  createdAt: new Date('2026-09-23T10:00:00.000Z'),
  readAt: null,
  resolvedAt: null,
  resource: { kind: 'document', id: 'document-1', projectId: 'project-1' },
  context: {
    subject: 'Invoice 001',
    related: null,
    date: null,
    amount: null,
    conflictKind: null,
  },
};

describe('NotificationItem destination access', () => {
  it('hides a notification destination when its resource is not visible', () => {
    render(
      <NotificationItem
        view={view}
        activeOperation={null}
        onView={vi.fn()}
        canViewTarget={() => false}
        onMarkRead={vi.fn()}
        onResolve={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Ver notificación' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marcar notificación como leída' })).toBeInTheDocument();
  });
});
