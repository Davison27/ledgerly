export const ID_GENERATOR = Symbol('IdGenerator');

export interface IdGenerator {
  generate(): string;
}
