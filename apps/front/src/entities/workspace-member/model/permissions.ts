import { WORKSPACE_MODULES } from '../api/types';
import type {
  PermissionLevelDto,
  PermissionMatrixDto,
  WorkspaceModuleDto,
  WorkspaceRoleDto,
} from '../api/types';

export const PERMISSION_LEVELS: readonly PermissionLevelDto[] = ['none', 'view', 'edit'];

export function moduleSupportsEdit(module: WorkspaceModuleDto): boolean {
  return module !== 'dashboard';
}

type PresetRole = 'admin' | 'editor' | 'viewer';

function buildMatrix(resolve: (module: WorkspaceModuleDto) => PermissionLevelDto): PermissionMatrixDto {
  return WORKSPACE_MODULES.reduce<PermissionMatrixDto>(
    (matrix, module) => {
      matrix[module] = resolve(module);
      return matrix;
    },
    {} as PermissionMatrixDto,
  );
}

export const ROLE_PRESETS: Record<PresetRole, PermissionMatrixDto> = {
  admin: buildMatrix((module) => (module === 'dashboard' ? 'view' : 'edit')),
  editor: buildMatrix((module) => (module === 'dashboard' || module === 'staff' ? 'view' : 'edit')),
  viewer: buildMatrix(() => 'view'),
};

export function emptyMatrix(): PermissionMatrixDto {
  return buildMatrix(() => 'none');
}

export function matrixForRole(role: WorkspaceRoleDto): PermissionMatrixDto {
  if (role === 'custom') return emptyMatrix();
  return { ...ROLE_PRESETS[role] };
}

function matchesPreset(matrix: PermissionMatrixDto, preset: PermissionMatrixDto): boolean {
  return WORKSPACE_MODULES.every((module) => matrix[module] === preset[module]);
}

export function resolveRole(matrix: PermissionMatrixDto): WorkspaceRoleDto {
  const presetRoles = Object.keys(ROLE_PRESETS) as PresetRole[];
  const matched = presetRoles.find((role) => matchesPreset(matrix, ROLE_PRESETS[role]));
  return matched ?? 'custom';
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
