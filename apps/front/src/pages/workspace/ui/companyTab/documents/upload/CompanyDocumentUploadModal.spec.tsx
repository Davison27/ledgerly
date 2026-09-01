import { App, ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompanyDocumentUploadModal } from './CompanyDocumentUploadModal';

describe('CompanyDocumentUploadModal', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the company responsibility notice without restricting the selected category', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const getComputedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => getComputedStyle(element));

    render(
      <QueryClientProvider client={client}>
        <ConfigProvider>
          <App>
            <CompanyDocumentUploadModal
              open
              typeId="bank-certificate"
              documentTypes={[
                {
                  id: 'bank-certificate',
                  code: 'bank_account_ownership_certificate',
                  name: 'Bank account ownership certificate',
                },
              ]}
              onCancel={vi.fn()}
              onCreated={vi.fn()}
            />
          </App>
        </ConfigProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Certificado de titularidad de cuenta bancaria')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Sube únicamente documentos que pertenezcan a tu empresa. Eres responsable del contenido que subas y de proteger el acceso a la información sensible.',
      ),
    ).toBeInTheDocument();
  });
});
