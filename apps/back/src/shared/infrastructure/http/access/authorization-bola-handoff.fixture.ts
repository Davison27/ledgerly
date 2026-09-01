import { AuthorizationResourceInput } from './authorization-resource-input-policy.fixture';

export interface AuthorizationResourceParameterHandoff {
  method: string;
  path: string;
  parameters: readonly string[];
  context: string;
  enforcement: string;
  additionalInputs?: readonly AuthorizationResourceInput[];
}

export const authorizationResourceParameterHandoffs: readonly AuthorizationResourceParameterHandoff[] = [
  { method: 'DELETE', path: '/company/documents/:documentId', parameters: ['documentId'], context: 'company', enforcement: 'Delete the company document only when its id affects one row.' },
  { method: 'DELETE', path: '/extraction-hints/:id', parameters: ['id'], context: 'documents', enforcement: 'Load the extraction hint by id before deletion.' },
  { method: 'DELETE', path: '/equipment/:equipmentId/documents/:documentId', parameters: ['equipmentId', 'documentId'], context: 'equipment', enforcement: 'Delete documentId only when it belongs to equipmentId.' },
  { method: 'DELETE', path: '/equipment/:id', parameters: ['id'], context: 'equipment', enforcement: 'Load the equipment by id before deletion.' },
  { method: 'DELETE', path: '/projects/:id', parameters: ['id'], context: 'projects', enforcement: 'Load the project by id before deletion.' },
  { method: 'DELETE', path: '/projects/:projectId/documents/:id', parameters: ['projectId', 'id'], context: 'documents', enforcement: 'Verify the document belongs to projectId before deletion.' },
  { method: 'DELETE', path: '/projects/:projectId/equipment/:equipmentId', parameters: ['projectId', 'equipmentId'], context: 'projects', enforcement: 'Verify the equipment association belongs to projectId before deletion.' },
  { method: 'DELETE', path: '/schedule/events/:id', parameters: ['id'], context: 'schedule', enforcement: 'Load the schedule event by id before deletion.' },
  { method: 'DELETE', path: '/staff/:id', parameters: ['id'], context: 'staff', enforcement: 'Load the staff member by id before deletion.' },
  { method: 'DELETE', path: '/staff/:staffMemberId/documents/:documentId', parameters: ['staffMemberId', 'documentId'], context: 'staff', enforcement: 'Verify the staff document belongs to staffMemberId before deletion.' },
  { method: 'DELETE', path: '/suppliers/:id', parameters: ['id'], context: 'suppliers', enforcement: 'Load the supplier by id before deletion.' },
  { method: 'DELETE', path: '/workspace/members/:id', parameters: ['id'], context: 'auth', enforcement: 'Apply the existing global-admin member-removal rules to id.' },
  { method: 'GET', path: '/company/documents', parameters: [], context: 'company', enforcement: 'Scope the company document list to the reviewed type identifier.', additionalInputs: [{ location: 'query', key: 'typeId' }] },
  { method: 'GET', path: '/company/documents/:documentId/file', parameters: ['documentId'], context: 'company', enforcement: 'Verify documentId belongs to the singleton company before streaming its file.' },
  { method: 'GET', path: '/equipment/:equipmentId/documents', parameters: ['equipmentId'], context: 'equipment', enforcement: 'Require a known equipmentId before listing its documents.' },
  { method: 'GET', path: '/equipment/:equipmentId/documents/:documentId/file', parameters: ['equipmentId', 'documentId'], context: 'equipment', enforcement: 'Stream documentId only when it belongs to equipmentId.' },
  { method: 'GET', path: '/projects/:id', parameters: ['id'], context: 'projects', enforcement: 'Load the project by id before returning it.' },
  { method: 'GET', path: '/projects/:projectId/documents', parameters: ['projectId'], context: 'documents', enforcement: 'Scope the document list to projectId.' },
  { method: 'GET', path: '/projects/:projectId/documents/:documentId/file', parameters: ['projectId', 'documentId'], context: 'documents', enforcement: 'Verify documentId belongs to projectId before streaming its file.' },
  { method: 'GET', path: '/projects/:projectId/documents/:id', parameters: ['projectId', 'id'], context: 'documents', enforcement: 'Verify the document belongs to projectId before returning it.' },
  { method: 'GET', path: '/projects/:projectId/equipment', parameters: ['projectId'], context: 'projects', enforcement: 'Scope the equipment associations to projectId.' },
  { method: 'GET', path: '/staff/:id', parameters: ['id'], context: 'staff', enforcement: 'Load the staff member by id before returning it.' },
  { method: 'GET', path: '/staff/:staffMemberId/documents', parameters: ['staffMemberId'], context: 'staff', enforcement: 'Scope the staff document list to staffMemberId.', additionalInputs: [{ location: 'query', key: 'typeId' }] },
  { method: 'GET', path: '/staff/:staffMemberId/documents/:documentId/file', parameters: ['staffMemberId', 'documentId'], context: 'staff', enforcement: 'Verify documentId belongs to staffMemberId before streaming its file.' },
  { method: 'GET', path: '/suppliers/:id', parameters: ['id'], context: 'suppliers', enforcement: 'Load the supplier by id before returning it.' },
  { method: 'GET', path: '/tax-compliance/profiles/:projectId', parameters: ['projectId'], context: 'tax-compliance', enforcement: 'Load the profile through projectId.' },
  { method: 'GET', path: '/workspace/members/:id/avatar', parameters: ['id'], context: 'auth', enforcement: 'Apply the existing global-admin member lookup rules to id.' },
  { method: 'PATCH', path: '/company/documents/:documentId', parameters: ['documentId'], context: 'company', enforcement: 'Verify documentId belongs to the singleton company before updating it.' },
  { method: 'PATCH', path: '/equipment/:equipmentId/documents/:documentId', parameters: ['equipmentId', 'documentId'], context: 'equipment', enforcement: 'Update documentId only when it belongs to equipmentId.' },
  { method: 'PATCH', path: '/equipment/:id', parameters: ['id'], context: 'equipment', enforcement: 'Load the equipment by id before updating it.' },
  { method: 'PATCH', path: '/projects/:id', parameters: ['id'], context: 'projects', enforcement: 'Load the project by id before updating it.' },
  { method: 'PATCH', path: '/projects/:projectId/documents/:id', parameters: ['projectId', 'id'], context: 'documents', enforcement: 'Verify the document belongs to projectId before updating it.', additionalInputs: [{ location: 'body', key: 'supplierId' }] },
  { method: 'PATCH', path: '/schedule/events/:id', parameters: ['id'], context: 'schedule', enforcement: 'Load the schedule event by id before updating it.', additionalInputs: [{ location: 'body', key: 'projectId' }, { location: 'body', key: 'staffMemberIds[]' }, { location: 'body', key: 'equipment[].equipmentId' }] },
  { method: 'PATCH', path: '/staff/:id', parameters: ['id'], context: 'staff', enforcement: 'Load the staff member by id before updating it.' },
  { method: 'PATCH', path: '/staff/:staffMemberId/documents/:documentId', parameters: ['staffMemberId', 'documentId'], context: 'staff', enforcement: 'Verify the staff document belongs to staffMemberId before updating it.' },
  { method: 'PATCH', path: '/suppliers/:id', parameters: ['id'], context: 'suppliers', enforcement: 'Load the supplier by id before updating it.' },
  { method: 'PATCH', path: '/tax-compliance/profiles/:projectId', parameters: ['projectId'], context: 'tax-compliance', enforcement: 'Load the profile through projectId before updating it.' },
  { method: 'PATCH', path: '/tax-compliance/sources/:sourceKey/review', parameters: ['sourceKey'], context: 'tax-compliance', enforcement: 'Load the tax source by sourceKey before reviewing it.' },
  { method: 'PATCH', path: '/workspace/members/:id', parameters: ['id'], context: 'auth', enforcement: 'Apply the existing global-admin member-update rules to id.' },
  { method: 'POST', path: '/company/documents', parameters: [], context: 'company', enforcement: 'Create the company document only for the singleton company and a known typeId.', additionalInputs: [{ location: 'body', key: 'payload.typeId' }] },
  { method: 'POST', path: '/equipment/:equipmentId/documents', parameters: ['equipmentId'], context: 'equipment', enforcement: 'Create a document only under a known equipmentId.' },
  { method: 'POST', path: '/notifications/:id/read', parameters: ['id'], context: 'notifications', enforcement: 'Load the notification by id before marking it read.' },
  { method: 'POST', path: '/notifications/:id/resolve', parameters: ['id'], context: 'notifications', enforcement: 'Load the notification by id before resolving it.' },
  { method: 'POST', path: '/projects/:projectId/documents', parameters: ['projectId'], context: 'documents', enforcement: 'Create the document only under projectId.', additionalInputs: [{ location: 'body', key: 'payload.supplierId' }] },
  { method: 'POST', path: '/projects/:projectId/documents/extract', parameters: ['projectId'], context: 'documents', enforcement: 'Create and extract the document only under projectId.' },
  { method: 'POST', path: '/projects/:projectId/equipment', parameters: ['projectId'], context: 'projects', enforcement: 'Create the equipment association only under projectId.', additionalInputs: [{ location: 'body', key: 'equipmentId' }] },
  { method: 'GET', path: '/documents', parameters: [], context: 'documents', enforcement: 'Scope document filters by the reviewed query resource identifiers.', additionalInputs: [{ location: 'query', key: 'projectId' }, { location: 'query', key: 'supplierId' }, { location: 'query', key: 'staffMemberId' }] },
  { method: 'GET', path: '/schedule/events', parameters: [], context: 'schedule', enforcement: 'Scope schedule events by the reviewed query resource identifiers.', additionalInputs: [{ location: 'query', key: 'projectId' }, { location: 'query', key: 'staffMemberId' }] },
  { method: 'GET', path: '/tax-compliance/calendar', parameters: [], context: 'tax-compliance', enforcement: 'Scope tax deadlines by the reviewed project query identifier.', additionalInputs: [{ location: 'query', key: 'projectId' }] },
  { method: 'POST', path: '/schedule/events', parameters: [], context: 'schedule', enforcement: 'Create schedule events only for the reviewed project, staff, and equipment identifiers.', additionalInputs: [{ location: 'body', key: 'projectId' }, { location: 'body', key: 'staffMemberIds[]' }, { location: 'body', key: 'equipment[].equipmentId' }] },
];
