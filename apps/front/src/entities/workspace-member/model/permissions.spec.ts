import { describe, expect, it } from 'vitest';
import { WORKSPACE_MODULES } from '../api/types';
import {
  countAccess,
  emptyMatrix,
  fillMatrix,
  grantsWorkspaceAdmin,
  hasModuleAccess,
  matrixForRole,
  moduleSupportsEdit,
} from './permissions';

describe('workspace permissions', () => {
  it('keeps administrator access independent from the stored permission matrix', () => {
    const matrix = matrixForRole('admin');

    expect(matrix.dashboard).toBe('view');
    expect(Object.values(matrix).filter((level) => level === 'edit')).toHaveLength(
      WORKSPACE_MODULES.length - 1,
    );
    expect(hasModuleAccess('admin', emptyMatrix(), 'staff', 'edit')).toBe(true);
  });

  it('uses view-only permissions as the member invitation default', () => {
    const matrix = matrixForRole('member');

    expect(Object.values(matrix)).toEqual(Array(WORKSPACE_MODULES.length).fill('view'));
    expect(hasModuleAccess('member', emptyMatrix(), 'projects', 'view')).toBe(false);
  });

  it('creates a none matrix and counts access levels', () => {
    expect(countAccess(emptyMatrix())).toEqual({
      edit: 0,
      view: 0,
      none: WORKSPACE_MODULES.length,
    });
  });

  it('does not grant edit access to dashboard when filling an edit matrix', () => {
    const matrix = fillMatrix('edit');

    expect(matrix.dashboard).toBe('view');
    expect(countAccess(matrix).edit).toBe(WORKSPACE_MODULES.length - 1);
  });

  it('only the explicit administrator role receives workspace-admin capability', () => {
    expect(grantsWorkspaceAdmin('admin')).toBe(true);
    expect(grantsWorkspaceAdmin('member')).toBe(false);
  });

  it('only treats non-dashboard modules as editable', () => {
    expect(moduleSupportsEdit('dashboard')).toBe(false);
    expect(moduleSupportsEdit('projects')).toBe(true);
  });
});
