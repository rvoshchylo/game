import { createProfile, type Profile } from '../run/meta';
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

export function toSave(p: Profile, now: number): SaveData {
  const data: SaveData = { version: SAVE_VERSION, profile: JSON.parse(JSON.stringify(p)) as Profile, savedAt: now };
  data.checksum = checksum(JSON.stringify({ ...data, checksum: undefined }));
  return data;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Deep-merge `src` onto `base`: missing keys keep defaults, wrong types fall back to defaults. */
function mergeDefaults<T>(base: T, src: unknown): T {
  if (Array.isArray(base)) return (Array.isArray(src) ? src : base) as T;
  if (!isObj(base)) return (typeof src === typeof base ? src : base) as T;
  if (!isObj(src)) return base;
  const out: Record<string, unknown> = { ...base };
  for (const k of Object.keys(base)) if (k in src) out[k] = mergeDefaults((base as Record<string, unknown>)[k], src[k]);
  return out as T;
}

export interface LoadResult {
  profile: Profile;
  checksumOk: boolean;
  migratedFrom: number;
  legacy: boolean;
}

export function fromSave(raw: unknown): LoadResult {
  if (!isObj(raw)) throw new Error('Save is not an object');
  const migratedFrom = typeof raw.version === 'number' ? raw.version : 1;
  const checksumOk = typeof raw.checksum === 'string' ? raw.checksum === checksum(JSON.stringify({ ...raw, checksum: undefined })) : migratedFrom < SAVE_VERSION;
  const data = migrate(raw);
  const profile = mergeDefaults(createProfile(), data.profile);
  if (!profile.chars.includes('unit7')) profile.chars.unshift('unit7');
  if (!profile.chars.includes(profile.selectedChar)) profile.selectedChar = 'unit7';
  return { profile, checksumOk, migratedFrom, legacy: !!data.legacy };
}

export const encodeExport = (data: SaveData): string => btoa(unescape(encodeURIComponent(JSON.stringify(data))));
export const decodeExport = (text: string): unknown => JSON.parse(decodeURIComponent(escape(atob(text.trim()))));
