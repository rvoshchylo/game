import { SAVE_VERSION } from './schema';

type AnySave = Record<string, unknown> & { version?: number };
type Migration = (old: AnySave) => AnySave;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * migrations[n] upgrades a save from version n to n+1. Never delete one.
 * v1–v3 were earlier prototypes (clicker, engineer); their progress means nothing to the
 * survivor game, so they become a fresh profile flagged `legacy`. Language/sound settings carry over.
 */
export const migrations: Record<number, Migration> = {
  1: () => ({ version: 2 }),
  2: () => ({ version: 3, legacy: true }),
  3: (old) => {
    const settings = isObj(old.state) && isObj(old.state.settings) ? old.state.settings : undefined;
    return { version: 4, legacy: true, profile: settings ? { settings } : undefined };
  },
};

export class FutureSaveError extends Error {}

export function migrate(raw: AnySave): AnySave {
  let data = raw;
  let v = typeof data.version === 'number' ? data.version : 1;
  if (v > SAVE_VERSION) throw new FutureSaveError(`Save version ${v} is newer than game version ${SAVE_VERSION}`);
  let legacy = false;
  while (v < SAVE_VERSION) {
    const m = migrations[v];
    if (!m) throw new Error(`No migration from v${v}`);
    const next = m(data);
    legacy = legacy || !!next.legacy;
    data = { ...next, legacy };
    v = data.version as number;
  }
  return data;
}
