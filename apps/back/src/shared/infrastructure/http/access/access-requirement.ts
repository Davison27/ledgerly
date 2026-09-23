import {
  PermissionLevel,
  WORKSPACE_MODULES,
  WorkspaceModule,
} from '../../../../contexts/auth/domain/value-objects/permission-matrix';

export const ACCESS_REQUIREMENT_KEY = 'auth:accessRequirement';

export type AccessRequirement =
  | { kind: 'authenticated' }
  | { kind: 'notifications' }
  | { kind: 'admin' }
  | { kind: 'access'; module: WorkspaceModule; level: PermissionLevel };

export function appendAccessRequirement(
  requirement: AccessRequirement,
): ClassDecorator & MethodDecorator {
  const decorator: ClassDecorator & MethodDecorator = (
    target: object,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ): void => {
    const methodMetadataTarget: unknown = descriptor?.value;
    const metadataTarget = propertyKey === undefined ? target : methodMetadataTarget;

    if (
      metadataTarget === undefined ||
      metadataTarget === null ||
      (typeof metadataTarget !== 'object' && typeof metadataTarget !== 'function')
    ) {
      return;
    }

    const existingMetadata: unknown = Reflect.getOwnMetadata(
      ACCESS_REQUIREMENT_KEY,
      metadataTarget,
    );
    const existingRequirements =
      existingMetadata === undefined ? [] : accessRequirementsFromMetadata(existingMetadata);

    if (existingRequirements === null) {
      return;
    }

    Reflect.defineMetadata(
      ACCESS_REQUIREMENT_KEY,
      [...existingRequirements, requirement],
      metadataTarget,
    );
  };

  return decorator;
}

export function accessRequirementsFromMetadata(
  metadata: unknown,
): readonly AccessRequirement[] | null {
  const requirements = Array.isArray(metadata) ? metadata : [metadata];

  if (requirements.length === 0 || !requirements.every(isAccessRequirement)) {
    return null;
  }

  return requirements;
}

function isAccessRequirement(value: unknown): value is AccessRequirement {
  if (typeof value !== 'object' || value === null || !('kind' in value)) {
    return false;
  }

  if (
    value.kind === 'authenticated' ||
    value.kind === 'notifications' ||
    value.kind === 'admin'
  ) {
    return true;
  }

  return (
    value.kind === 'access' &&
    'module' in value &&
    WORKSPACE_MODULES.some((module) => module === value.module) &&
    'level' in value &&
    (value.level === 'none' || value.level === 'view' || value.level === 'edit')
  );
}
