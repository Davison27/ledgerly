import { STORED_FILE_STORES } from './store-registry';

describe('stored file store registry', () => {
  it('maps every encrypted store to its immutable envelope and metadata columns', () => {
    expect(STORED_FILE_STORES).toEqual([
      {
        name: 'document',
        table: 'documents',
        ciphertextColumn: 'content_ciphertext',
        nonceColumn: 'content_nonce',
        tagColumn: 'content_tag',
        keyVersionColumn: 'content_key_version',
        envelopeMetadata: false,
        mimeTypeColumn: 'mime_type',
        sizeColumn: 'file_size',
      },
      {
        name: 'invoicePdf',
        table: 'invoices',
        ciphertextColumn: 'pdf_ciphertext',
        nonceColumn: 'pdf_nonce',
        tagColumn: 'pdf_tag',
        keyVersionColumn: 'pdf_key_version',
        envelopeMetadata: false,
        mimeType: 'application/pdf',
        sizeColumn: 'pdf_size',
      },
      {
        name: 'staffDocument',
        table: 'staff_documents',
        ciphertextColumn: 'content_ciphertext',
        nonceColumn: 'content_nonce',
        tagColumn: 'content_tag',
        keyVersionColumn: 'content_key_version',
        envelopeMetadata: false,
        mimeTypeColumn: 'mime_type',
        sizeColumn: 'file_size',
      },
      {
        name: 'companyLogo',
        table: 'companies',
        ciphertextColumn: 'logo_ciphertext',
        nonceColumn: 'logo_nonce',
        tagColumn: 'logo_tag',
        keyVersionColumn: 'logo_key_version',
        envelopeMetadata: true,
        mimeTypeColumn: 'logo_mime_type',
        sizeColumn: 'logo_size',
      },
      {
        name: 'projectImage',
        table: 'projects',
        ciphertextColumn: 'image_ciphertext',
        nonceColumn: 'image_nonce',
        tagColumn: 'image_tag',
        keyVersionColumn: 'image_key_version',
        envelopeMetadata: true,
        mimeTypeColumn: 'image_mime_type',
        sizeColumn: 'image_size',
      },
      {
        name: 'productImage',
        table: 'products',
        ciphertextColumn: 'image_ciphertext',
        nonceColumn: 'image_nonce',
        tagColumn: 'image_tag',
        keyVersionColumn: 'image_key_version',
        envelopeMetadata: true,
        mimeTypeColumn: 'image_mime_type',
        sizeColumn: 'image_size',
      },
    ]);
  });
});
