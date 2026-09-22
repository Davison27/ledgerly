import { WORKSPACE_MODULES } from '../api/types';
import type {
  PermissionLevelDto,
  PermissionMatrixDto,
  WorkspaceModuleDto,
  WorkspaceRoleDto,
} from '../api/types';

export const PERMISSION_LEVELS: readonly PermissionLevelDto[] = ['none', 'view', 'edit'];

const PERMISSION_RANK: Record<PermissionLevelDto, number> = {
  none: 0,
  view: 1,
  edit: 2,
};

export function moduleSupportsEdit(module: WorkspaceModuleDto): boolean {
  return module !== 'dashboard';
}

function buildMatrix(resolve: (module: WorkspaceModuleDto) => PermissionLevelDto): PermissionMatrixDto {
  return WORKSPACE_MODULES.reduce<PermissionMatrixDto>(
    (matrix, module) => {
      matrix[module] = resolve(module);
      return matrix;
    },
    {} as PermissionMatrixDto,
  );
}

export function emptyMatrix(): PermissionMatrixDto {
  return buildMatrix(() => 'none');
}

export function matrixForRole(role: WorkspaceRoleDto): PermissionMatrixDto {
  if (role === 'admin') return buildMatrix((module) => (module === 'dashboard' ? 'view' : 'edit'));
  return buildMatrix(() => 'view');
}

export function fillMatrix(level: PermissionLevelDto): PermissionMatrixDto {
  return buildMatrix((module) => (level === 'edit' && !moduleSupportsEdit(module) ? 'view' : level));
}

export function countAccess(matrix: PermissionMatrixDto): { edit: number; view: number; none: number } {
  return WORKSPACE_MODULES.reduce(
    (counts, module) => {
      counts[matrix[module]] += 1;
      return counts;
    },
    { edit: 0, view: 0, none: 0 },
  );
}

export function grantsWorkspaceAdmin(role: WorkspaceRoleDto): boolean {
  return role === 'admin';
}

export function hasModuleAccess(
  role: WorkspaceRoleDto,
  permissions: PermissionMatrixDto,
  module: WorkspaceModuleDto,
  level: PermissionLevelDto,
): boolean {
  if (grantsWorkspaceAdmin(role)) return true;
  return PERMISSION_RANK[permissions[module]] >= PERMISSION_RANK[level];
}
