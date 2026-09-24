export interface KnownParty {
  name: string;
  taxId: string;
}

export const KNOWN_PARTY_DIRECTORY = Symbol('KnownPartyDirectory');

export interface KnownPartyDirectory {
  findCompanyTaxId(): Promise<string | null>;
  findActiveSupplierByTaxId(canonicalTaxId: string): Promise<KnownParty | null>;
}
