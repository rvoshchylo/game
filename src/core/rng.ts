/** Deterministic, serializable RNG (mulberry32). State lives in GameState so saves replay identically. */
export interface RngHolder {
  rngState: number;
}

export function nextRandom(h: RngHolder): number {
  h.rngState = (h.rngState + 0x6d2b79f5) | 0;
  let t = h.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const randRange = (h: RngHolder, min: number, max: number): number => min + (max - min) * nextRandom(h);

export function weightedPick<T>(h: RngHolder, items: T[], weight: (t: T) => number): T {
  const total = items.reduce((s, i) => s + weight(i), 0);
  let r = nextRandom(h) * total;
  for (const i of items) {
    r -= weight(i);
    if (r <= 0) return i;
  }
  return items[items.length - 1];
}
