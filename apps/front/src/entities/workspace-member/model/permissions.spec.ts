import { describe, expect, it } from 'vitest';
import { WORKSPACE_MODULES } from '../api/types';
import {
  ROLE_PRESETS,
  countAccess,
  emptyMatrix,
  fillMatrix,
  grantsWorkspaceAdmin,
  matrixForRole,
  moduleSupportsEdit,
  resolveRole,
} from './permissions';

describe('workspace permissions', () => {
  it('gives administrators edit access except dashboard view access', () => {
    const matrix = matrixForRole('admin');

    expect(matrix.dashboard).toBe('view');
    expect(Object.values(matrix).filter((level) => level === 'edit')).toHaveLength(
      WORKSPACE_MODULES.length - 1,
    );
    expect(resolveRole(matrix)).toBe('admin');
  });

  it('keeps staff read-only in the editor preset', () => {
    expect(matrixForRole('editor').staff).toBe('view');
    expect(matrixForRole('editor').projects).toBe('edit');
    expect(resolveRole(matrixForRole('editor'))).toBe('editor');
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

  it('recognizes custom matrices instead of misclassifying them as presets', () => {
    const custom = { ...ROLE_PRESETS.viewer, projects: 'none' as const };

    expect(resolveRole(custom)).toBe('custom');
  });

  it('only administrators receive workspace-admin capability', () => {
    expect(grantsWorkspaceAdmin('admin')).toBe(true);
    expect(grantsWorkspaceAdmin('editor')).toBe(false);
    expect(grantsWorkspaceAdmin('viewer')).toBe(false);
    expect(grantsWorkspaceAdmin('custom')).toBe(false);
  });

  it('only treats non-dashboard modules as editable', () => {
    expect(moduleSupportsEdit('dashboard')).toBe(false);
    expect(moduleSupportsEdit('projects')).toBe(true);
  });
});
