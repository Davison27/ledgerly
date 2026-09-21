export type DeletionOutcome = 'deleted' | 'archived';

export class DeletionOutcomeResponse {
  constructor(readonly outcome: DeletionOutcome) {}
}
