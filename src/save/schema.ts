import type { GameState } from '../core/state';

export const SAVE_VERSION = 3;

/** v3: the whole (JSON-safe) game state, including an expedition in progress. */
export interface SaveData {
  version: number;
  state: GameState;
  savedAt: number;
  /** Corruption detection only — never trust a local save. */
  checksum?: string;
}
