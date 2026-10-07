import { createInitialState, type GameState } from '../core/state';
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
  const state = JSON.parse(JSON.stringify({ ...s, timestamps: { ...s.timestamps, lastSaved: now } })) as GameState;
  const data: SaveData = { version: SAVE_VERSION, state, savedAt: now };
  data.checksum = checksum(JSON.stringify({ ...data, checksum: undefined }));
  return data;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Deep-merge `src` onto `base`: missing keys keep defaults, wrong types fall back to defaults.
 * Open-ended records (buildings, weapon timers) keep extra keys; `exp` is taken as-is.
 */
function mergeDefaults<T>(base: T, src: unknown, open = false): T {
  if (Array.isArray(base)) return (Array.isArray(src) ? src : base) as T;
  if (base === null) return (src === undefined ? base : src) as T;
  if (!isObj(base)) return (typeof src === typeof base ? src : base) as T;
  if (!isObj(src)) return base;
  const out: Record<string, unknown> = { ...base };
  const keys = open ? new Set([...Object.keys(base), ...Object.keys(src)]) : new Set(Object.keys(base));
  for (const k of keys) {
    if (!(k in src)) continue;
    const b = (base as Record<string, unknown>)[k];
    out[k] = b === undefined ? src[k] : mergeDefaults(b, src[k], k === 'buildings');
  }
  return out as T;
}

export interface LoadResult {
  state: GameState;
  checksumOk: boolean;
  migratedFrom: number;
  legacy: boolean;
}

export function fromSave(raw: unknown, now: number): LoadResult {
  if (!isObj(raw)) throw new Error('Save is not an object');
  const migratedFrom = typeof raw.version === 'number' ? raw.version : 1;
  const checksumOk = typeof raw.checksum === 'string' ? raw.checksum === checksum(JSON.stringify({ ...raw, checksum: undefined })) : migratedFrom < SAVE_VERSION;
  const data = migrate(raw);
  const fresh = createInitialState(now);
  if (data.legacy || !isObj(data.state)) return { state: fresh, checksumOk, migratedFrom, legacy: !!data.legacy };
  const state = mergeDefaults(fresh, data.state);
  // Expedition state is engine-owned; take it whole when present.
  state.exp = isObj(data.state.exp) ? (data.state.exp as unknown as GameState['exp']) : null;
  state.lastReport = isObj(data.state.lastReport) ? (data.state.lastReport as unknown as GameState['lastReport']) : null;
  return { state, checksumOk, migratedFrom, legacy: false };
}

export const encodeExport = (data: SaveData): string => btoa(unescape(encodeURIComponent(JSON.stringify(data))));
export const decodeExport = (text: string): unknown => JSON.parse(decodeURIComponent(escape(atob(text.trim()))));
