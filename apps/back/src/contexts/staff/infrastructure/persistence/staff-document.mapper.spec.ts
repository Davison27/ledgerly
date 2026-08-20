import { StaffDocumentMapper } from './staff-document.mapper';
import { StaffDocument } from '../../domain/staff-document';

function buildDocument(): StaffDocument {
  return StaffDocument.create({
    id: 'staff-doc-1',
    staffMemberId: 'staff-1',
    typeId: 'type-dni',
    name: 'DNI',
    issueDate: '2024-01-10',
    fileName: 'dni.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024,
  });
}

describe('StaffDocumentMapper', () => {
  it('never assigns an encrypted envelope, so an update can never overwrite the stored file', () => {
    const orm = StaffDocumentMapper.toOrm(buildDocument());

    expect(orm.contentCiphertext).toBeUndefined();
    expect(orm.contentNonce).toBeUndefined();
    expect(orm.contentTag).toBeUndefined();
    expect(orm.contentKeyVersion).toBeUndefined();
  });
});
