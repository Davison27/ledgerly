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
  // Same guarantee as `document.mapper.spec.ts`: `content` (bytea,
  // `select: false`) must never be assigned by `toOrm`, so a
  // `repository.save()` on edit can never wipe out the stored file.
  it('never assigns content, so an update can never overwrite the stored file', () => {
    const orm = StaffDocumentMapper.toOrm(buildDocument());

    expect(orm.content).toBeUndefined();
  });
});
