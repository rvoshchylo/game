import { SAVE_VERSION } from './schema';

type AnySave = Record<string, unknown> & { version?: number };
type Migration = (old: AnySave) => AnySave;

/**
 * migrations[n] upgrades a save from version n to n+1.
 * Rule: never delete a migration; old saves must load forever.
 */
export const migrations: Record<number, Migration> = {
  // v1 = the first prototype: flat fields, "gold" instead of scrap, no probes/equipment.
  1: (old) => {
    const num = (k: string, d = 0) => (typeof old[k] === 'number' ? (old[k] as number) : d);
    const ups = (old.upgrades ?? {}) as Record<string, number>;
    const now = num('lastSaved', 0);
    return {
      version: 2,
      player: { depth: num('depth', 1), maxDepth: num('depth', 1), bestDepth: num('depth', 1) },
      currencies: { scrap: num('gold'), shards: 0, echoes: 0 },
      progression: { upgrades: { servo: ups.servo ?? 0, motor: ups.motor ?? 0 } },
      timestamps: { created: now, lastSaved: now, lastTick: now },
    };
  },
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
