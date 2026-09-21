export interface SeedProjectClientReference {
  clientKey: string;
}

export interface SeedClientReference {
  id: string;
  archivedAt?: string;
}

export function resolveSeedProjectClientId(
  project: SeedProjectClientReference,
  clientsByTaxId: ReadonlyMap<string, SeedClientReference>,
): string {
  const client = clientsByTaxId.get(project.clientKey);
  if (!client || client.archivedAt !== undefined) {
    throw new Error(
      `Seed project client key must resolve to a declared active client: ${project.clientKey}`,
    );
  }

  return client.id;
}
