import { App, ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/httpClient';
import { ThemeModeProvider } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { DocumentUploadModal } from './DocumentUploadModal';

const mocks = vi.hoisted(() => ({
  createDocument: vi.fn(),
  extractInvoice: vi.fn(),
  extractInvoiceStandalone: vi.fn(),
  createStaffMember: vi.fn(),
  createSupplier: vi.fn(),
}));

vi.mock('@/entities/document', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/entities/document')>()),
  createDocument: mocks.createDocument,
  extractInvoice: mocks.extractInvoice,
  extractInvoiceStandalone: mocks.extractInvoiceStandalone,
  documentQueries: {
    all: ['documents'],
    duplicateCheckPage: () => ({
      queryKey: ['documents', 'duplicate-check'],
      queryFn: async () => ({ items: [], total: 0 }),
    }),
  },
}));

vi.mock('@/entities/project', () => ({
  projectQueries: {
    all: ['projects'],
    list: () => ({ queryKey: ['projects'], queryFn: async () => [] }),
  },
}));

vi.mock('@/entities/staff-member', () => ({
  createStaffMember: mocks.createStaffMember,
  staffQueries: {
    all: ['staff-members'],
    list: () => ({ queryKey: ['staff-members'], queryFn: async () => [] }),
  },
}));

vi.mock('@/entities/supplier', () => ({
  createSupplier: mocks.createSupplier,
  supplierQueries: {
    all: ['suppliers'],
    list: () => ({ queryKey: ['suppliers'], queryFn: async () => [] }),
  },
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

const extractionResult = {
  source: 'heuristic' as const,
  confidence: 'high' as const,
  fields: {
    name: 'Factura septiembre',
    type: 'factura' as const,
    date: '2026-09-01',
    amount: 121,
    currency: 'EUR',
  },
  warnings: [],
};

function renderModal() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ConfigProvider>
        <ThemeModeProvider>
          <App>
            <DocumentUploadModal
              open
              context={{ kind: 'project', projectId: 'project-1' }}
              onCancel={vi.fn()}
              onCreated={vi.fn()}
            />
          </App>
        </ThemeModeProvider>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

function selectPdf(): File {
  const file = new File(['pdf'], 'invoice.pdf', { type: 'application/pdf' });
  const input = document.querySelector('input[type="file"]');
  if (!input) throw new Error('PDF input was not rendered');
  fireEvent.change(input, { target: { files: [file] } });
  return file;
}

function extractionCallbacks() {
  const call = mocks.extractInvoice.mock.calls[0];
  if (!call) throw new Error('Extraction was not requested');
  return {
    onProgress: call[2] as (percent: number) => void,
    onUploadComplete: call[3] as () => void,
  };
}

describe('DocumentUploadModal', () => {
  const createObjectUrlDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
  const revokeObjectUrlDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');

  beforeAll(() => {
    Object.defineProperties(URL, {
      createObjectURL: {
        configurable: true,
        value: vi.fn(() => 'blob:invoice'),
      },
      revokeObjectURL: {
        configurable: true,
        value: vi.fn(),
      },
    });
  });

  afterAll(() => {
    if (createObjectUrlDescriptor) {
      Object.defineProperty(URL, 'createObjectURL', createObjectUrlDescriptor);
    } else {
      Reflect.deleteProperty(URL, 'createObjectURL');
    }
    if (revokeObjectUrlDescriptor) {
      Object.defineProperty(URL, 'revokeObjectURL', revokeObjectUrlDescriptor);
    } else {
      Reflect.deleteProperty(URL, 'revokeObjectURL');
    }
  });

  beforeEach(() => {
    mocks.createDocument.mockReset();
    mocks.extractInvoice.mockReset();
    mocks.extractInvoiceStandalone.mockReset();
    const getComputedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => getComputedStyle(element));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows upload progress only while the browser reports computable bytes, then processing after upload completion', async () => {
    const extraction = deferred<typeof extractionResult>();
    mocks.extractInvoice.mockReturnValue(extraction.promise);
    renderModal();

    selectPdf();
    const { onProgress, onUploadComplete } = extractionCallbacks();

    expect(screen.getByRole('status')).toHaveTextContent('Subiendo el PDF');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

    onProgress(100);
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Subiendo el PDF: 100%');
    });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.queryByText('Analizando amenazas de seguridad y leyendo el PDF')).not.toBeInTheDocument();

    onUploadComplete();
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Analizando amenazas de seguridad y leyendo el PDF',
      );
    });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

    extraction.resolve(extractionResult);
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Listo para revisar');
    });
    expect(screen.getByLabelText('Nombre')).toHaveValue('Factura septiembre');
  });

  it('keeps the uploading state indeterminate when the browser cannot calculate bytes', () => {
    const extraction = deferred<typeof extractionResult>();
    mocks.extractInvoice.mockReturnValue(extraction.promise);
    renderModal();

    selectPdf();

    expect(screen.getByRole('status')).toHaveTextContent('Subiendo el PDF');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it.each([
    {
      status: 422,
      code: 'MALWARE_DETECTED',
      alertText: 'Este PDF se ha rechazado porque se ha detectado una amenaza de seguridad.',
    },
    {
      status: 503,
      code: 'MALWARE_SCANNER_UNAVAILABLE',
      alertText: 'El análisis de seguridad no está disponible temporalmente.',
    },
  ])('keeps the selected file visible for extraction error $code', async ({ status, code, alertText }) => {
    const extraction = deferred<typeof extractionResult>();
    mocks.extractInvoice.mockReturnValue(extraction.promise);
    renderModal();

    selectPdf();
    extraction.reject(new ApiError(status, { code }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(alertText);
    });
    expect(screen.getByText('invoice.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cambiar PDF/ })).toBeEnabled();
  });

  it('keeps the PDF and enables the manual form when automatic text extraction is unavailable', async () => {
    const extraction = deferred<typeof extractionResult>();
    mocks.extractInvoice.mockReturnValue(extraction.promise);
    renderModal();

    selectPdf();
    extraction.reject(new ApiError(422, { code: 'PDF_NO_TEXT_LAYER' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No pudimos leer el texto de este PDF automáticamente.',
      );
    });
    expect(screen.getByText('invoice.pdf')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toBeEnabled();
  });

  it.each([
    {
      status: 422,
      code: 'MALWARE_DETECTED',
      alertText: 'Este PDF se ha rechazado porque se ha detectado una amenaza de seguridad.',
    },
    {
      status: 503,
      code: 'MALWARE_SCANNER_UNAVAILABLE',
      alertText: 'El análisis de seguridad no está disponible temporalmente.',
    },
  ])('keeps extracted form data and the file after save error $code', async ({ status, code, alertText }) => {
    const user = userEvent.setup();
    const extraction = deferred<typeof extractionResult>();
    mocks.extractInvoice.mockReturnValue(extraction.promise);
    mocks.createDocument.mockRejectedValue(new ApiError(status, { code }));
    renderModal();

    selectPdf();
    const { onUploadComplete } = extractionCallbacks();
    onUploadComplete();
    extraction.resolve(extractionResult);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Listo para revisar');
    });
    await user.click(screen.getByRole('button', { name: 'Crear documento' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(alertText);
    });
    expect(screen.getByText('invoice.pdf')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Factura septiembre');
  });
});
