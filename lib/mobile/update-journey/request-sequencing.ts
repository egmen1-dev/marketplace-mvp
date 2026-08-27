/** Request sequencing for update checks — stale responses are ignored. */

export type UpdateCheckSequenceGuard = {
  next: () => number;
  isLatest: (sequence: number) => boolean;
  current: () => number;
};

export function createUpdateCheckSequenceGuard(): UpdateCheckSequenceGuard {
  let current = 0;
  return {
    next() {
      current += 1;
      return current;
    },
    isLatest(sequence: number) {
      return sequence === current;
    },
    current() {
      return current;
    },
  };
}
