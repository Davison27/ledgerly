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
  // Fixes the guarantee R1 of the document-crud plan depends on: TypeORM's
  // SubjectChangedColumnsComputer excludes `undefined` properties from the
  // UPDATE's SET clause (it does NOT exclude `null`, only `undefined`), so
  // as long as `toOrm` never assigns `content`, the stored PDF (a `bytea`
  // column, `select: false`) survives every `repository.save()` on edit,
  // including the new PATCH this plan adds. If someone later adds
  // `orm.content = ...` to this mapper, this test goes red before any PDF
  // is silently wiped out by an update.
  it('never assigns content, so an update can never overwrite the stored PDF', () => {
    const orm = DocumentMapper.toOrm(buildDocument());

    expect(orm.content).toBeUndefined();
  });
});
