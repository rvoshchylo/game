import { createInitialState, type GameState } from '../core/state';
import { isBossAt } from '../core/systems/progression';
import { migrate } from './migrations';
import { SAVE_VERSION, type SaveData } from './schema';

/** FNV-1a — detects corruption/truncation, NOT tampering. */
export function checksum(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function toSave(s: GameState, now: number): SaveData {
  const data: SaveData = {
    version: SAVE_VERSION,
    player: {
      depth: s.depth,
      maxDepth: s.maxDepth,
      bestDepth: s.bestDepth,
      kills: s.kills,
      mode: s.mode,
      integrity: s.integrity,
      heat: s.heat,
      doctrine: s.doctrine,
      rustDebt: s.rustDebt,
    },
    currencies: { scrap: s.scrap, shards: s.shards, echoes: s.echoes },
    progression: {
      upgrades: { ...s.upgrades },
      flags: [...s.flags],
      memories: [...s.memories],
      logs: [...s.logs],
      codex: [...s.codex],
      achievements: [...s.achievements],
      runWardens: s.runWardens,
      clearedWardens: [...s.clearedWardens],
      heirloomUid: s.heirloomUid,
      ghostFractures: s.ghostFractures,
      nextSignalIn: s.nextSignalIn,
    },
    equipment: { ...s.equipped },
    inventory: s.inventory.map((i) => ({ ...i })),
    probes: s.probes.map((p) => ({ ...p, outcome: { ...p.outcome } })),
    stats: { ...s.stats },
    settings: { ...s.settings },
    timestamps: { ...s.timestamps, lastSaved: now },
    system: { rngState: s.rngState, nextUid: s.nextUid },
  };
  data.checksum = checksum(JSON.stringify({ ...data, checksum: undefined }));
  return data;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Deep-merge `src` onto `base`, keeping base's types: unknown keys are dropped, missing keys keep defaults. */
function mergeDefaults<T>(base: T, src: unknown): T {
  if (!isObj(base) || !isObj(src)) {
    if (Array.isArray(base)) return (Array.isArray(src) ? src : base) as T;
    if (base === null) return (src === undefined ? base : src) as T;
    return (typeof src === typeof base ? src : base) as T;
  }
  const out: Record<string, unknown> = { ...base };
  for (const k of Object.keys(base)) if (k in src) out[k] = mergeDefaults((base as Record<string, unknown>)[k], src[k]);
  return out as T;
}

export interface LoadResult {
  state: GameState;
  checksumOk: boolean;
  migratedFrom: number;
}

export function fromSave(raw: unknown, now: number): LoadResult {
  if (!isObj(raw)) throw new Error('Save is not an object');
  const migratedFrom = typeof raw.version === 'number' ? raw.version : 1;
  const checksumOk = typeof raw.checksum === 'string' ? raw.checksum === checksum(JSON.stringify({ ...raw, checksum: undefined })) : migratedFrom < SAVE_VERSION;
  const data = migrate(raw);
  const fresh = createInitialState(now);
  const defaults = toSave(fresh, now);
  const d = mergeDefaults(defaults, data);

  const s = fresh;
  s.depth = Math.max(1, Math.floor(d.player.depth));
  s.maxDepth = Math.max(s.depth, d.player.maxDepth);
  s.bestDepth = Math.max(s.maxDepth, d.player.bestDepth);
  s.kills = d.player.kills;
  s.mode = d.player.mode === 'hold' ? 'hold' : 'push';
  s.integrity = d.player.integrity;
  s.heat = Math.min(100, Math.max(0, d.player.heat));
  s.doctrine = d.player.doctrine;
  s.rustDebt = d.player.rustDebt;
  s.scrap = Math.max(0, d.currencies.scrap);
  s.shards = Math.max(0, d.currencies.shards);
  s.echoes = Math.max(0, d.currencies.echoes);
  s.upgrades = mergeDefaults(fresh.upgrades, d.progression.upgrades);
  s.flags = d.progression.flags;
  s.memories = d.progression.memories;
  s.logs = d.progression.logs;
  s.codex = d.progression.codex;
  s.achievements = d.progression.achievements;
  s.runWardens = d.progression.runWardens;
  s.clearedWardens = d.progression.clearedWardens;
  s.heirloomUid = d.progression.heirloomUid;
  s.ghostFractures = d.progression.ghostFractures;
  s.nextSignalIn = d.progression.nextSignalIn;
  s.inventory = d.inventory.length ? d.inventory : fresh.inventory;
  s.equipped = d.equipment;
  if (!s.inventory.some((i) => i.uid === s.equipped.core)) s.equipped.core = fresh.equipped.core;
  s.probes = d.probes;
  s.stats = mergeDefaults(fresh.stats, d.stats);
  s.settings = d.settings;
  s.timestamps = d.timestamps;
  s.rngState = d.system.rngState;
  s.nextUid = Math.max(d.system.nextUid, s.inventory.length + 1);
  // Never resume mid-Warden: the fight restarts from the depth above.
  if (isBossAt(s, s.depth)) {
    s.depth--;
    s.kills = 0;
  }
  return { state: s, checksumOk, migratedFrom };
}

export const encodeExport = (data: SaveData): string => btoa(unescape(encodeURIComponent(JSON.stringify(data))));
export const decodeExport = (text: string): unknown => JSON.parse(decodeURIComponent(escape(atob(text.trim()))));
