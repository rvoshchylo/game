import { SAVE_VERSION } from './schema';

type AnySave = Record<string, unknown> & { version?: number };
type Migration = (old: AnySave) => AnySave;

/**
 * migrations[n] upgrades a save from version n to n+1. Never delete one.
 * v1/v2 were the clicker prototype; their progress has no meaning in the engineer
 * design, so they become a fresh v3 save flagged `legacy` (the UI explains why).
 */
export const migrations: Record<number, Migration> = {
  1: () => ({ version: 2 }),
  2: () => ({ version: 3, legacy: true }),
};

export class FutureSaveError extends Error {}

export function migrate(raw: AnySave): AnySave {
  let data = raw;
  let v = typeof data.version === 'number' ? data.version : 1;
  if (v > SAVE_VERSION) throw new FutureSaveError(`Save version ${v} is newer than game version ${SAVE_VERSION}`);
  while (v < SAVE_VERSION) {
    const m = migrations[v];
    if (!m) throw new Error(`No migration from v${v}`);
    data = m(data);
    v = data.version as number;
  }
  return data;
}
