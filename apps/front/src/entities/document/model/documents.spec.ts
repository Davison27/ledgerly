import { describe, expect, it } from 'vitest';
import { mapDocumentDto } from './documents';
import { formatEUR } from './documentFormat';

describe('document view model', () => {
  it('maps nullable DTO fields to UI-safe optional fields', () => {
    const document = mapDocumentDto({
      id: 'doc-1',
      projectId: 'project-1',
      name: 'Invoice',
      type: 'factura',
      direction: 'ingreso',
      month: 8,
      date: '2026-08-29',
      amount: 1234.5,
      status: 'pendiente',
      rawStatus: 'pendiente',
      issuerName: null,
      invoiceNumber: null,
      hasFile: undefined,
      fileName: null,
      fileSize: null,
    });

    expect(document).toMatchObject({ id: 'doc-1', amount: 1234.5, hasFile: false });
    expect(document.issuerName).toBeUndefined();
    expect(document.fileName).toBeUndefined();
    expect(document.fileSize).toBeUndefined();
  });

  it('formats euro amounts using Spanish currency conventions', () => {
    const formatted = formatEUR(1234.5);

    expect(formatted).toContain('1235');
    expect(formatted).toContain('€');
  });
});
