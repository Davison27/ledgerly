import {
  CREATABLE_DOCUMENT_TYPES,
  isCreatableDocumentType,
} from '../../contexts/documents/domain/document-type';
import { generateDocuments } from './document-seed-data';

describe('generateDocuments', () => {
  it('generates only creatable document types without staff members', () => {
    const documents = [1, 2, 3, 4, 5].flatMap((seed) => generateDocuments(seed));

    expect(documents).not.toHaveLength(0);
    expect(documents.every((document) => isCreatableDocumentType(document.type))).toBe(true);
    expect(documents.every((document) => document.staffMemberId === null)).toBe(true);
    expect(documents.every((document) => !Object.hasOwn(document, 'month'))).toBe(true);
    expect(new Set(documents.map((document) => document.type))).toEqual(
      new Set(CREATABLE_DOCUMENT_TYPES),
    );
  });

  it('generates deterministic English business data', () => {
    const documents = generateDocuments(1);

    expect(documents.map((document) => document.name)).toContain('Rapid Transport LLC');
    expect(
      documents
        .filter((document) => document.type === 'invoice')
        .every((document) => document.invoiceNumber?.startsWith('INV-')),
    ).toBe(true);
  });
});
