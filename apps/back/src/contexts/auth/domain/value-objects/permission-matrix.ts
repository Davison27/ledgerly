import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';

export const WORKSPACE_MODULES = [
  'dashboard',
  'projects',
  'calendar',
  'documents',
  'suppliers',
  'equipment',
  'staff',
  'planning',
] as const;

export type WorkspaceModule = (typeof WORKSPACE_MODULES)[number];
export type PermissionLevel = 'none' | 'view' | 'edit';
export type PermissionMatrixPrimitives = Record<WorkspaceModule, PermissionLevel>;
export type WorkspaceRole = 'admin' | 'member';

const PERMISSION_LEVELS: readonly PermissionLevel[] = ['none', 'view', 'edit'];

function buildMatrix(
  resolve: (module: WorkspaceModule) => PermissionLevel,
): PermissionMatrixPrimitives {
  return WORKSPACE_MODULES.reduce<PermissionMatrixPrimitives>((matrix, module) => {
    matrix[module] = resolve(module);
    return matrix;
  }, {} as PermissionMatrixPrimitives);
}

function isPermissionLevel(value: unknown): value is PermissionLevel {
  return typeof value === 'string' && (PERMISSION_LEVELS as string[]).includes(value);
}

export class PermissionMatrix {
  private constructor(private readonly value: PermissionMatrixPrimitives) {}

  static admin(): PermissionMatrix {
    return new PermissionMatrix(
      buildMatrix((module) => (module === 'dashboard' ? 'view' : 'edit')),
    );
  }

  static create(value: Record<string, unknown>): PermissionMatrix {
    const keys = Object.keys(value);
    const legacyModules = WORKSPACE_MODULES.filter((module) => module !== 'planning');
    const isLegacyMatrix =
      keys.length === legacyModules.length && legacyModules.every((module) => keys.includes(module));

    if (
      !isLegacyMatrix &&
      (keys.length !== WORKSPACE_MODULES.length ||
        !WORKSPACE_MODULES.every((module) => keys.includes(module)))
    ) {
      throw new InvalidValueException(
        'permission matrix must declare exactly the workspace modules',
      );
    }

    for (const module of WORKSPACE_MODULES) {
      const level = module === 'planning' && value[module] === undefined ? 'none' : value[module];
      if (!isPermissionLevel(level)) {
        throw new InvalidValueException(
          `permission level for ${module} must be none, view or edit`,
        );
      }
    }

    if (value.dashboard === 'edit') {
      throw new InvalidValueException('dashboard does not support edit');
    }

    return new PermissionMatrix({ ...value, planning: value.planning ?? 'none' } as PermissionMatrixPrimitives);
  }

  levelFor(module: WorkspaceModule): PermissionLevel {
    return this.value[module];
  }

  allows(module: WorkspaceModule, level: PermissionLevel): boolean {
    return PERMISSION_LEVELS.indexOf(this.value[module]) >= PERMISSION_LEVELS.indexOf(level);
  }

  toPrimitives(): PermissionMatrixPrimitives {
    return { ...this.value };
  }
}
