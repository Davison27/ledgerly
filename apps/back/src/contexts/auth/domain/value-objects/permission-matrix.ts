import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';

export const WORKSPACE_MODULES = [
  'dashboard',
  'projects',
  'calendar',
  'documents',
  'suppliers',
  'equipment',
  'staff',
] as const;

export type WorkspaceModule = (typeof WORKSPACE_MODULES)[number];
export type PermissionLevel = 'none' | 'view' | 'edit';
export type PermissionMatrixPrimitives = Record<WorkspaceModule, PermissionLevel>;
export type WorkspaceRole = 'admin' | 'editor' | 'viewer' | 'custom';

const PERMISSION_LEVELS: readonly PermissionLevel[] = ['none', 'view', 'edit'];

type PresetRole = 'admin' | 'editor' | 'viewer';

function buildMatrix(resolve: (module: WorkspaceModule) => PermissionLevel): PermissionMatrixPrimitives {
  return WORKSPACE_MODULES.reduce<PermissionMatrixPrimitives>(
    (matrix, module) => {
      matrix[module] = resolve(module);
      return matrix;
    },
    {} as PermissionMatrixPrimitives,
  );
}

const ROLE_PRESETS: Record<PresetRole, PermissionMatrixPrimitives> = {
  admin: buildMatrix((module) => (module === 'dashboard' ? 'view' : 'edit')),
  editor: buildMatrix((module) => (module === 'dashboard' || module === 'staff' ? 'view' : 'edit')),
  viewer: buildMatrix(() => 'view'),
};

function isPermissionLevel(value: unknown): value is PermissionLevel {
  return typeof value === 'string' && (PERMISSION_LEVELS as string[]).includes(value);
}

export class PermissionMatrix {
  private constructor(private readonly value: PermissionMatrixPrimitives) {}

  static admin(): PermissionMatrix {
    return new PermissionMatrix({ ...ROLE_PRESETS.admin });
  }

  static create(value: Record<string, unknown>): PermissionMatrix {
    const keys = Object.keys(value);

    if (keys.length !== WORKSPACE_MODULES.length || !WORKSPACE_MODULES.every((module) => keys.includes(module))) {
      throw new InvalidValueException('permission matrix must declare exactly the workspace modules');
    }

    for (const module of WORKSPACE_MODULES) {
      if (!isPermissionLevel(value[module])) {
        throw new InvalidValueException(`permission level for ${module} must be none, view or edit`);
      }
    }

    if (value.dashboard === 'edit') {
      throw new InvalidValueException('dashboard does not support edit');
    }

    return new PermissionMatrix({ ...(value as PermissionMatrixPrimitives) });
  }

  levelFor(module: WorkspaceModule): PermissionLevel {
    return this.value[module];
  }

  allows(module: WorkspaceModule, level: PermissionLevel): boolean {
    return PERMISSION_LEVELS.indexOf(this.value[module]) >= PERMISSION_LEVELS.indexOf(level);
  }

  deriveRole(): WorkspaceRole {
    const presetRoles = Object.keys(ROLE_PRESETS) as PresetRole[];
    const matched = presetRoles.find((role) =>
      WORKSPACE_MODULES.every((module) => this.value[module] === ROLE_PRESETS[role][module]),
    );
    return matched ?? 'custom';
  }

  toPrimitives(): PermissionMatrixPrimitives {
    return { ...this.value };
  }
}
