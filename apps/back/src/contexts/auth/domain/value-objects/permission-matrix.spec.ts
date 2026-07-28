import { PermissionMatrix, WORKSPACE_MODULES } from './permission-matrix';
import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';

function fullMatrix(level: 'none' | 'view' | 'edit'): Record<string, string> {
  return WORKSPACE_MODULES.reduce<Record<string, string>>((matrix, module) => {
    matrix[module] = level;
    return matrix;
  }, {});
}

describe('PermissionMatrix', () => {
  it('rejects a matrix that is missing a module', () => {
    const matrix = fullMatrix('view');
    delete matrix.staff;

    expect(() => PermissionMatrix.create(matrix)).toThrow(InvalidValueException);
  });

  it('rejects a matrix with an extra key', () => {
    const matrix = { ...fullMatrix('view'), extra: 'view' };

    expect(() => PermissionMatrix.create(matrix)).toThrow(InvalidValueException);
  });

  it('rejects a matrix with an invalid level', () => {
    const matrix = { ...fullMatrix('view'), documents: 'write' };

    expect(() => PermissionMatrix.create(matrix)).toThrow(InvalidValueException);
  });

  it('rejects dashboard set to edit', () => {
    const matrix = { ...fullMatrix('edit'), dashboard: 'edit' };

    expect(() => PermissionMatrix.create(matrix)).toThrow(InvalidValueException);
  });

  it('derives the admin role from the admin preset', () => {
    const matrix = PermissionMatrix.create({ ...fullMatrix('edit'), dashboard: 'view' });

    expect(matrix.deriveRole()).toBe('admin');
  });

  it('derives the editor role from the editor preset', () => {
    const matrix = PermissionMatrix.create({
      ...fullMatrix('edit'),
      dashboard: 'view',
      staff: 'view',
    });

    expect(matrix.deriveRole()).toBe('editor');
  });

  it('derives the viewer role from the viewer preset', () => {
    const matrix = PermissionMatrix.create(fullMatrix('view'));

    expect(matrix.deriveRole()).toBe('viewer');
  });

  it('derives custom for a matrix that matches no preset', () => {
    const matrix = PermissionMatrix.create({
      ...fullMatrix('view'),
      documents: 'edit',
    });

    expect(matrix.deriveRole()).toBe('custom');
  });

  it('allows view when the level is edit', () => {
    const matrix = PermissionMatrix.create({ ...fullMatrix('none'), documents: 'edit' });

    expect(matrix.allows('documents', 'view')).toBe(true);
    expect(matrix.allows('documents', 'edit')).toBe(true);
  });

  it('does not allow edit when the level is view', () => {
    const matrix = PermissionMatrix.create({ ...fullMatrix('none'), documents: 'view' });

    expect(matrix.allows('documents', 'view')).toBe(true);
    expect(matrix.allows('documents', 'edit')).toBe(false);
  });
});
