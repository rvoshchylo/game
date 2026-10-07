import type { Rarity, SlotId, UpgradeId } from '../data/types';
import type { LifetimeStat, ProbeRun, Settings } from '../core/state';

export const SAVE_VERSION = 2;

/** Persisted shape. Deliberately separate from GameState: transient combat state is never saved. */
export interface SaveData {
  version: number;
  player: {
    depth: number;
    maxDepth: number;
    bestDepth: number;
    kills: number;
    mode: 'push' | 'hold';
    integrity: number;
    heat: number;
    doctrine: string;
    rustDebt: number;
  };
  currencies: { scrap: number; shards: number; echoes: number };
  progression: {
    upgrades: Record<UpgradeId, number>;
    flags: string[];
    memories: string[];
    logs: string[];
    codex: string[];
    achievements: string[];
    runWardens: number;
    clearedWardens: number[];
    heirloomUid: string | null;
    ghostFractures: number;
    nextSignalIn: number;
  };
  equipment: Record<SlotId, string | null>;
  inventory: { uid: string; defId: string; rarity: Rarity }[];
  probes: ProbeRun[];
  stats: Record<LifetimeStat, number>;
  settings: Settings;
  timestamps: { created: number; lastSaved: number; lastTick: number };
  system: { rngState: number; nextUid: number };
  /** Corruption detection only — never trust a local save. */
  checksum?: string;
}
