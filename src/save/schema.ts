import type { Profile } from '../run/meta';

export const SAVE_VERSION = 4;

/** v4: the survivor profile (meta progress + settings). Runs themselves are not saved. */
export interface SaveData {
  version: number;
  profile: Profile;
  savedAt: number;
  /** Corruption detection only — never trust a local save. */
  checksum?: string;
}
