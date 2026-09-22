import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { currentReleaseVersion } from '@/entities/release-note';
import i18n from '@/shared/i18n';
import { ReleaseNoticeDialog } from './ReleaseNoticeDialog';

const apiMocks = vi.hoisted(() => ({
  getAcknowledgement: vi.fn(),
  acknowledge: vi.fn(),
}));

vi.mock('@/entities/release-note/api/release-notes.api', () => ({
  getReleaseNoteAcknowledgement: apiMocks.getAcknowledgement,
  acknowledgeReleaseNote: apiMocks.acknowledge,
}));

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

function renderReleaseNotice(onViewChangelog = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const rendered = render(
    <QueryClientProvider client={client}>
      <ReleaseNoticeDialog onViewChangelog={onViewChangelog} />
    </QueryClientProvider>,
  );
  return { ...rendered, client };
}

describe('ReleaseNoticeDialog', () => {
  beforeEach(async () => {
    apiMocks.getAcknowledgement.mockReset();
    apiMocks.acknowledge.mockReset();
    await i18n.changeLanguage('en');
  });

  afterEach(async () => {
    await i18n.changeLanguage('es');
  });

  it('waits for the server decision and does not flash a modal while the query is pending', async () => {
    const response = deferred<{ acknowledged: boolean; acknowledgedAt: string | null }>();
    apiMocks.getAcknowledgement.mockReturnValue(response.promise);
    renderReleaseNotice();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await act(async () => {
      response.resolve({ acknowledged: false, acknowledgedAt: null });
    });
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Added' })).toBeInTheDocument();
    expect(screen.getByText('Release history')).toBeInTheDocument();
  });

  it('renders the notice actions and release copy in Spanish', async () => {
    await i18n.changeLanguage('es');
    apiMocks.getAcknowledgement.mockResolvedValue({ acknowledged: false, acknowledgedAt: null });
    renderReleaseNotice();

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Historial de versiones')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aceptar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver el registro completo' })).toBeInTheDocument();
  });

  it('stays open after Escape and mask clicks and has no close icon', async () => {
    apiMocks.getAcknowledgement.mockResolvedValue({ acknowledged: false, acknowledgedAt: null });
    renderReleaseNotice();
    const dialog = await screen.findByRole('dialog');

    fireEvent.keyDown(document, { key: 'Escape', keyCode: 27 });
    const modalWrap = dialog.closest('.ant-modal-wrap');
    if (!modalWrap) throw new Error('Modal wrapper was not rendered');
    fireEvent.mouseDown(modalWrap, { target: modalWrap });
    fireEvent.click(modalWrap, { target: modalWrap });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(document.querySelector('.ant-modal-close')).not.toBeInTheDocument();
  });

  it('stays hidden after the server reports that this version was acknowledged', async () => {
    apiMocks.getAcknowledgement.mockResolvedValue({
      acknowledged: true,
      acknowledgedAt: '2026-09-22T10:00:00.000Z',
    });
    const { client } = renderReleaseNotice();

    await waitFor(() => {
      expect(
        client.getQueryData(['release-notes', 'acknowledgement', currentReleaseVersion]),
      ).toEqual({
        acknowledged: true,
        acknowledgedAt: '2026-09-22T10:00:00.000Z',
      });
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not close or navigate until the acknowledgement request succeeds', async () => {
    const write = deferred<void>();
    let acknowledged = false;
    const onViewChangelog = vi.fn();
    apiMocks.getAcknowledgement.mockImplementation(async () => ({
      acknowledged,
      acknowledgedAt: acknowledged ? '2026-09-22T10:00:00.000Z' : null,
    }));
    apiMocks.acknowledge.mockImplementation(async () => {
      await write.promise;
      acknowledged = true;
    });
    renderReleaseNotice(onViewChangelog);

    fireEvent.click(await screen.findByRole('button', { name: 'View full changelog' }));
    await waitFor(() => expect(apiMocks.acknowledge).toHaveBeenCalledWith(currentReleaseVersion));
    expect(onViewChangelog).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await act(async () => {
      write.resolve();
    });
    await waitFor(() => expect(onViewChangelog).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows a retryable error and keeps the notice open when acknowledgement fails', async () => {
    apiMocks.getAcknowledgement.mockResolvedValue({ acknowledged: false, acknowledgedAt: null });
    apiMocks.acknowledge.mockRejectedValueOnce(new Error('network error'));
    renderReleaseNotice();

    fireEvent.click(await screen.findByRole('button', { name: 'OK' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not save your acknowledgement. Try again.',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('offers a localized retry when the acknowledgement query fails', async () => {
    apiMocks.getAcknowledgement
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ acknowledged: false, acknowledgedAt: null });
    renderReleaseNotice();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not check whether you have seen this release. Try again.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Release history')).toBeInTheDocument();
  });
});
