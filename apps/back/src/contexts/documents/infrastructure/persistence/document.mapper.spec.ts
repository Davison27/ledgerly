import { DocumentMapper } from './document.mapper';
import { Document } from '../../domain/document';

function buildDocument(): Document {
  return Document.create({
    id: 'doc-1',
    projectId: 'project-1',
    name: 'Invoice',
    type: 'factura',
    month: 6,
    date: '2026-06-01',
    amount: 100,
    status: 'pendiente',
    direction: 'gasto',
  });
}

describe('DocumentMapper', () => {
  it('never assigns an encrypted envelope, so an update can never overwrite the stored PDF', () => {
    const orm = DocumentMapper.toOrm(buildDocument());

    expect(orm.contentCiphertext).toBeUndefined();
    expect(orm.contentNonce).toBeUndefined();
    expect(orm.contentTag).toBeUndefined();
    expect(orm.contentKeyVersion).toBeUndefined();
  });
});
