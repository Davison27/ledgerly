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

  it('rejects an invalid planning level', () => {
    const matrix = { ...fullMatrix('view'), planning: 'write' };

    expect(() => PermissionMatrix.create(matrix)).toThrow(InvalidValueException);
  });

  it('defaults a missing planning permission to none', () => {
    const matrix = fullMatrix('view');
    delete matrix.planning;

    expect(PermissionMatrix.create(matrix).toPrimitives()).toEqual({
      ...matrix,
      planning: 'none',
    });
  });

  it('rejects dashboard set to edit', () => {
    const matrix = { ...fullMatrix('edit'), dashboard: 'edit' };

    expect(() => PermissionMatrix.create(matrix)).toThrow(InvalidValueException);
  });

  it('creates the matrix used when bootstrapping the administrator', () => {
    expect(PermissionMatrix.admin().toPrimitives()).toEqual({
      dashboard: 'view',
      projects: 'edit',
      calendar: 'edit',
      documents: 'edit',
      suppliers: 'edit',
      equipment: 'edit',
      staff: 'edit',
      planning: 'edit',
    });
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
