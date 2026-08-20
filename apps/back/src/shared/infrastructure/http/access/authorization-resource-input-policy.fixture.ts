import { authorizationRoutePolicies } from './authorization-route-policy.fixture';

export type AuthorizationResourceInputLocation = 'path' | 'query' | 'body';

export interface AuthorizationResourceInput {
  location: AuthorizationResourceInputLocation;
  key: string;
}

export interface AuthorizationRouteResourceInputPolicy {
  method: string;
  path: string;
  resourceInputs: readonly AuthorizationResourceInput[];
}

function pathResourceInputs(path: string): AuthorizationResourceInput[] {
  return [...path.matchAll(/:([^/]+)/g)].map((match) => ({ location: 'path', key: match[1] }));
}

const reviewedQueryAndBodyResourceInputsByRoute: Readonly<Record<string, readonly AuthorizationResourceInput[]>> = {
  'GET /documents': [
    { location: 'query', key: 'projectId' },
    { location: 'query', key: 'supplierId' },
    { location: 'query', key: 'staffMemberId' },
  ],
  'GET /schedule/events': [
    { location: 'query', key: 'projectId' },
    { location: 'query', key: 'staffMemberId' },
  ],
  'GET /staff/:staffMemberId/documents': [{ location: 'query', key: 'typeId' }],
  'GET /tax-compliance/calendar': [{ location: 'query', key: 'projectId' }],
  'PATCH /projects/:projectId/documents/:id': [
    { location: 'body', key: 'supplierId' },
    { location: 'body', key: 'staffMemberId' },
  ],
  'PATCH /schedule/events/:id': [
    { location: 'body', key: 'projectId' },
    { location: 'body', key: 'staffMemberIds[]' },
    { location: 'body', key: 'products[].productId' },
  ],
  'POST /projects/:projectId/documents': [
    { location: 'body', key: 'payload.supplierId' },
    { location: 'body', key: 'payload.staffMemberId' },
  ],
  'POST /projects/:projectId/products': [{ location: 'body', key: 'productId' }],
  'POST /staff/:staffMemberId/documents': [{ location: 'body', key: 'typeId' }],
  'POST /schedule/events': [
    { location: 'body', key: 'projectId' },
    { location: 'body', key: 'staffMemberIds[]' },
    { location: 'body', key: 'products[].productId' },
  ],
};

export const authorizationRouteResourceInputPolicies: readonly AuthorizationRouteResourceInputPolicy[] =
  authorizationRoutePolicies.map((route) => ({
    method: route.method,
    path: route.path,
    resourceInputs: [
      ...pathResourceInputs(route.path),
      ...(reviewedQueryAndBodyResourceInputsByRoute[`${route.method} ${route.path}`] ?? []),
    ],
  }));
