import {
  ACCESS_REQUIREMENT_KEY,
  accessRequirementsFromMetadata,
} from '../../../../shared/infrastructure/http/access/access-requirement';
import type { AccessRequirement } from '../../../../shared/infrastructure/http/access/access-requirement';
import { IS_PUBLIC_KEY } from '../../../../shared/infrastructure/http/access/public.decorator';
import { CompanyController } from './company.controller';

function accessRequirementsFor(method: string): readonly AccessRequirement[] {
  const handler: unknown = Object.getOwnPropertyDescriptor(CompanyController.prototype, method)?.value;
  if (typeof handler !== 'function') return [];

  const metadata: unknown = Reflect.getMetadata(ACCESS_REQUIREMENT_KEY, handler);
  return accessRequirementsFromMetadata(metadata) ?? [];
}

function handlerFor(method: string): object {
  const handler: unknown = Object.getOwnPropertyDescriptor(CompanyController.prototype, method)?.value;
  if (typeof handler !== 'function') throw new Error(`CompanyController.${method} is missing`);

  return handler;
}

describe('CompanyController access', () => {
  it('limits the full company profile to administrators', () => {
    expect(accessRequirementsFor('getCompany')).toContainEqual({ kind: 'admin' });
  });

  it('keeps branding public and the existing update route administrator-only', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handlerFor('branding'))).toBe(true);
    expect(accessRequirementsFor('branding')).not.toContainEqual({ kind: 'admin' });
    expect(accessRequirementsFor('update')).toContainEqual({ kind: 'admin' });
  });
});
