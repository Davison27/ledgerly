export interface TaxSourceEvent {
  uid: string;
  summary: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  lastModified: string | null;
}

export type TaxSourceChangeKind = 'added' | 'removed' | 'modified';

export interface TaxSourceChange {
  kind: TaxSourceChangeKind;
  uid: string;
  before: TaxSourceEvent | null;
  after: TaxSourceEvent | null;
}

export function sortTaxSourceEvents(events: TaxSourceEvent[]): TaxSourceEvent[] {
  return [...events].sort((a, b) => a.uid.localeCompare(b.uid));
}

export function diffTaxSourceEvents(
  before: TaxSourceEvent[],
  after: TaxSourceEvent[],
): TaxSourceChange[] {
  const beforeByUid = new Map(before.map((event) => [event.uid, event]));
  const afterByUid = new Map(after.map((event) => [event.uid, event]));
  const changes: TaxSourceChange[] = [];

  for (const event of after) {
    const previous = beforeByUid.get(event.uid);
    if (!previous) {
      changes.push({ kind: 'added', uid: event.uid, before: null, after: event });
      continue;
    }

    if (JSON.stringify(previous) !== JSON.stringify(event)) {
      changes.push({ kind: 'modified', uid: event.uid, before: previous, after: event });
    }
  }

  for (const event of before) {
    if (!afterByUid.has(event.uid)) {
      changes.push({ kind: 'removed', uid: event.uid, before: event, after: null });
    }
  }

  return changes.sort((a, b) => a.uid.localeCompare(b.uid) || a.kind.localeCompare(b.kind));
}
