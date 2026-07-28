export const TOKEN_GENERATOR = Symbol('TokenGenerator');

export interface TokenGenerator {
  generateOpaqueToken(): string;
  hash(value: string): string;
  hashesMatch(hash: string, candidate: string): boolean;
}
