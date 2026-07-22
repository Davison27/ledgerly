export const PROJECT_NAME_PROVIDER = Symbol('ProjectNameProvider');

export interface ProjectNameSummary {
  id: string;
  name: string;
}

/**
 * Documents only ever needs a project's id and name to label a listing row
 * or a duplicate match; it has no business reading the rest of `projects`'
 * repository. See `invoices/domain/invoice-issuer.port.ts` for the same
 * narrow-port pattern applied to the `company` context.
 */
export interface ProjectNameProvider {
  findAllNames(): Promise<ProjectNameSummary[]>;
}
