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
  'GET /company/documents': [{ location: 'query', key: 'typeId' }],
  'GET /project-checklist-templates': [],
  'GET /project-checklist-templates/:id': [],
  'GET /projects/:projectId/checklist': [],
  'GET /documents': [
    { location: 'query', key: 'projectId' },
    { location: 'query', key: 'clientId' },
    { location: 'query', key: 'supplierId' },
    { location: 'query', key: 'staffMemberId' },
  ],
  'GET /schedule/editor/board': [],
  'GET /schedule/editor/equipment': [],
  'GET /schedule/editor/projects': [],
  'GET /schedule/editor/staff': [],
  'GET /schedule/events': [
    { location: 'query', key: 'projectId' },
    { location: 'query', key: 'staffMemberId' },
  ],
  'GET /staff/:staffMemberId/documents': [{ location: 'query', key: 'typeId' }],
  'GET /tax-compliance/calendar': [{ location: 'query', key: 'projectId' }],
  'PATCH /projects/:projectId/documents/:id': [{ location: 'body', key: 'supplierId' }],
  'PATCH /projects/:projectId/checklist/items/:itemId': [],
  'PATCH /projects/:id': [{ location: 'body', key: 'clientId' }],
  'PATCH /schedule/events/:id': [
    { location: 'body', key: 'projectId' },
    { location: 'body', key: 'staffMemberIds[]' },
    { location: 'body', key: 'equipment[].equipmentId' },
  ],
  'POST /projects/:projectId/documents': [{ location: 'body', key: 'payload.supplierId' }],
  'POST /project-checklist-templates': [],
  'POST /projects/:projectId/checklist/items': [],
  'POST /company/documents': [{ location: 'body', key: 'payload.typeId' }],
  'POST /projects/:projectId/equipment': [{ location: 'body', key: 'equipmentId' }],
  'POST /projects': [{ location: 'body', key: 'clientId' }],
  'POST /schedule/events': [
    { location: 'body', key: 'projectId' },
    { location: 'body', key: 'staffMemberIds[]' },
    { location: 'body', key: 'equipment[].equipmentId' },
  ],
  'DELETE /project-checklist-templates/:id': [],
  'DELETE /projects/:projectId/checklist/items/:itemId': [],
  'PUT /project-checklist-templates/:id': [],
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
