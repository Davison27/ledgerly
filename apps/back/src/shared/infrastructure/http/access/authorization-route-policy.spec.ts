import { RequestMethod, Type } from '@nestjs/common';
import { METHOD_METADATA, MODULE_METADATA, PATH_METADATA } from '@nestjs/common/constants';

jest.mock('better-auth/node', () => ({ fromNodeHeaders: jest.fn() }));
jest.mock('../../../../lib/auth', () => ({ auth: { api: { getSession: jest.fn() } } }));
jest.mock('../../../../contexts/auth/infrastructure/persistence/better-auth-session-revoker', () => ({
  BetterAuthSessionRevoker: class {},
}));
jest.mock('../../../../contexts/auth/infrastructure/persistence/better-auth-user-directory', () => ({
  BetterAuthUserDirectory: class {},
}));

import { AppModule } from '../../../../app.module';
import { ACCESS_REQUIREMENT_KEY, AccessRequirement } from './access-requirement';
import { authorizationResourceParameterHandoffs } from './authorization-bola-handoff.fixture';
import { AuthorizationResourceInput, authorizationRouteResourceInputPolicies } from './authorization-resource-input-policy.fixture';
import { authorizationRoutePolicies, AuthorizationRoutePolicy } from './authorization-route-policy.fixture';
import { IS_PUBLIC_KEY } from './public.decorator';

interface DynamicModuleReference {
  module?: Type<unknown>;
}

interface ControllerType extends Type<unknown> {
  prototype: Record<string, unknown>;
}

function readModuleReference(value: unknown): Type<unknown> | null {
  if (typeof value === 'function') {
    return value as Type<unknown>;
  }

  if (typeof value === 'object' && value !== null && 'module' in value) {
    return (value as DynamicModuleReference).module ?? null;
  }

  return null;
}

function reachableControllers(rootModule: Type<unknown>): ControllerType[] {
  const visitedModules = new Set<Type<unknown>>();
  const controllers = new Set<ControllerType>();

  function collect(moduleType: Type<unknown>): void {
    if (visitedModules.has(moduleType)) {
      return;
    }

    visitedModules.add(moduleType);

    const moduleControllers = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, moduleType) as
      | ControllerType[]
      | undefined;

    for (const controller of moduleControllers ?? []) {
      controllers.add(controller);
    }

    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, moduleType) as unknown[] | undefined;

    for (const importedModule of imports ?? []) {
      const moduleReference = readModuleReference(importedModule);

      if (moduleReference) {
        collect(moduleReference);
      }
    }
  }

  collect(rootModule);

  return [...controllers];
}

function routePath(controllerPath: string, handlerPath: string): string {
  const segments = [controllerPath, handlerPath]
    .flatMap((path) => path.split('/'))
    .filter((segment) => segment.length > 0);

  return segments.length === 0 ? '/' : `/${segments.join('/')}`;
}

function metadataFor<T>(handler: object, controller: ControllerType, key: string): T | undefined {
  const handlerMetadata: unknown = Reflect.getMetadata(key, handler);
  const controllerMetadata: unknown = Reflect.getMetadata(key, controller);

  return (handlerMetadata ?? controllerMetadata) as T | undefined;
}

function discoverAuthorizationRoutes(): AuthorizationRoutePolicy[] {
  return reachableControllers(AppModule)
    .flatMap((controller) => {
      const controllerPath = Reflect.getMetadata(PATH_METADATA, controller) as string | undefined;

      return Object.getOwnPropertyNames(controller.prototype).flatMap((name) => {
        const handler = controller.prototype[name];

        if (typeof handler !== 'function') {
          return [];
        }

        const method = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;
        const handlerPath = Reflect.getMetadata(PATH_METADATA, handler) as string | undefined;

        if (method === undefined || handlerPath === undefined) {
          return [];
        }

        return [{
          method: RequestMethod[method],
          path: routePath(controllerPath ?? '', handlerPath),
          public: metadataFor<boolean>(handler, controller, IS_PUBLIC_KEY) ?? false,
          access: metadataFor<AccessRequirement>(handler, controller, ACCESS_REQUIREMENT_KEY) ?? null,
        }];
      });
    })
    .sort((left, right) => `${left.method} ${left.path}`.localeCompare(`${right.method} ${right.path}`));
}

function routeParameters(path: string): string[] {
  return [...path.matchAll(/:([^/]+)/g)].map((match) => match[1]);
}

function pathResourceInputs(path: string): AuthorizationResourceInput[] {
  return routeParameters(path).map((key) => ({ location: 'path', key }));
}

function sortByRoute<T extends { method: string; path: string }>(entries: readonly T[]): T[] {
  return [...entries].sort((left, right) => `${left.method} ${left.path}`.localeCompare(`${right.method} ${right.path}`));
}

describe('AppModule authorization route policy', () => {
  it('classifies every reachable HTTP handler against the reviewed policy fixture', () => {
    const discoveredRoutes = discoverAuthorizationRoutes();

    expect(discoveredRoutes).toEqual(authorizationRoutePolicies);
    expect(discoveredRoutes).toHaveLength(83);
    expect(discoveredRoutes.every((route) => route.public || route.access !== null)).toBe(true);
  });

  it('keeps the reviewed resource-input policy aligned with every discovered route', () => {
    const discoveredRoutes = discoverAuthorizationRoutes();
    const reviewedRoutes = authorizationRouteResourceInputPolicies.map(({ method, path }) => ({ method, path }));

    expect(reviewedRoutes).toEqual(discoveredRoutes.map(({ method, path }) => ({ method, path })));
    expect(authorizationRouteResourceInputPolicies).toHaveLength(83);
  });

  it('keeps the resource-input handoff inventory complete', () => {
    const reviewedInventory = authorizationRouteResourceInputPolicies
      .filter((route) => route.resourceInputs.length > 0)
      .map(({ method, path, resourceInputs }) => ({ method, path, resourceInputs }));
    const handoffInventory = authorizationResourceParameterHandoffs.map(({ method, path, additionalInputs }) => ({
      method,
      path,
      resourceInputs: [...pathResourceInputs(path), ...(additionalInputs ?? [])],
    }));

    expect(sortByRoute(reviewedInventory)).toEqual(sortByRoute(handoffInventory));
    expect(authorizationResourceParameterHandoffs).toHaveLength(45);
    expect(authorizationRouteResourceInputPolicies.flatMap((route) => route.resourceInputs)).toHaveLength(69);
  });

  it('classifies the staff document type reference as a resource handoff', () => {
    expect(authorizationRouteResourceInputPolicies).toContainEqual({
      method: 'POST',
      path: '/staff/:staffMemberId/documents',
      resourceInputs: [
        { location: 'path', key: 'staffMemberId' },
        { location: 'body', key: 'typeId' },
      ],
    });

    expect(authorizationResourceParameterHandoffs).toContainEqual({
      method: 'POST',
      path: '/staff/:staffMemberId/documents',
      parameters: ['staffMemberId'],
      context: 'staff',
      enforcement: 'Create the staff document only under staffMemberId and a known typeId.',
      additionalInputs: [{ location: 'body', key: 'typeId' }],
    });
  });
});
