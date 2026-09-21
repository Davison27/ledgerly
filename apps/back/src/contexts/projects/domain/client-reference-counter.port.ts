export const CLIENT_REFERENCE_COUNTER = Symbol('ClientReferenceCounter');

export interface ClientReferenceCounter {
  count(clientId: string): Promise<number>;
}
