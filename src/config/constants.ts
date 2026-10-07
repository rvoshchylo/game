import type { Rarity } from '../data/types';

export const RARITY_COLOR: Record<Rarity, number> = {
  common: 0xb8aea3,
  rare: 0x6fb3ff,
  epic: 0xc77dff,
  relic: 0xffd166,
};

export const RARITY_CSS: Record<Rarity, string> = {
  common: '#b8aea3',
  rare: '#6fb3ff',
  epic: '#c77dff',
  relic: '#ffd166',
};

export const AUTOSAVE_SECONDS = 10;
/** A hidden tab longer than this is resolved with the offline model instead of live ticks. */
export const CATCH_UP_THRESHOLD_MS = 15_000;
/** Show the "while you were away" report only for meaningful absences. */
export const AWAY_REPORT_MIN_SEC = 60;
