import type { MetricKey, NodeType } from '../data/types';

export interface Placement {
  x: number;
  y: number;
  rot: number;
}

export interface ModuleInst {
  uid: string;
  defId: string;
  level: number;
  pos: Placement | null;
}

export interface Crate {
  scrap: number;
  copper: number;
}

export interface EnemyState {
  defId: string;
  hp: number;
  maxHp: number;
  armor: number;
  damage: number;
  interval: number;
  timer: number;
  elite: boolean;
  boss: boolean;
}

export interface FightState {
  enemies: EnemyState[];
  weaponTimers: Record<string, number>;
  tollTimer: number;
  phase2: boolean;
  elapsed: number;
}

export interface MapNode {
  type: NodeType;
  eventId?: string;
}

export type ExpPhase = 'choose' | 'walk' | 'fight' | 'node' | 'event' | 'return';

export interface Expedition {
  stratumId: string;
  tier: number;
  map: MapNode[][];
  layer: number;
  path: number[];
  phase: ExpPhase;
  /** Seconds left in the current timed phase (walk / node / return). */
  timer: number;
  /** Seconds before autopilot decides a fork or event for you. */
  waitTimer: number;
  crates: Crate[];
  blueprints: string[];
  cores: number;
  cratesLost: number;
  fight: FightState | null;
  broken: boolean;
  startedAt: number;
}

export interface ExpeditionReport {
  tier: number;
  layers: number;
  scrap: number;
  copper: number;
  cores: number;
  blueprints: string[];
  broken: boolean;
  cratesLost: number;
  overflow: number;
  bossDefeated: boolean;
  endedAt: number;
}

export interface Autopilot {
  priority: Exclude<NodeType, 'boss'>[];
  returnHpPct: number;
  returnWhenFull: boolean;
  avoidEliteHpPct: number;
  relaunch: boolean;
}

/** A journal line stored as a translation key + params; `text` only in pre-i18n saves. */
export interface JournalEntry {
  t: number;
  k?: string;
  p?: Record<string, string | number>;
  text?: string;
}

export interface Settings {
  /** '' = follow the browser language. */
  lang: string;
  introSeen: boolean;
  sfx: boolean;
  volume: number;
  reducedMotion: boolean;
}

export type StatKey = MetricKey | 'scrapEarned' | 'copperEarned' | 'clockAnomalies';

export interface GameState {
  scrap: number;
  copper: number;
  cores: number;
  modules: ModuleInst[];
  blueprints: string[];
  buildings: Record<string, number>;
  robot: { hp: number; shield: number; shieldDelay: number };
  exp: Expedition | null;
  tierUnlocked: number;
  selectedTier: number;
  autopilot: Autopilot;
  flags: string[];
  combos: string[];
  lore: number;
  seenEnemies: string[];
  journal: JournalEntry[];
  lastReport: ExpeditionReport | null;
  stats: Record<StatKey, number>;
  rngState: number;
  nextUid: number;
  settings: Settings;
  timestamps: { created: number; lastSaved: number; lastTick: number };
}

export const emptyStats = (): Record<StatKey, number> => ({
  expeditions: 0,
  breakdowns: 0,
  fightsWon: 0,
  elitesWon: 0,
  bossesWon: 0,
  modulesCrafted: 0,
  merges: 0,
  deepestLayer: 0,
  cratesLost: 0,
  scrapEarned: 0,
  copperEarned: 0,
  clockAnomalies: 0,
});

export const BASE_HP = 40;
export const BASE_CARGO = 3;

export function createInitialState(now: number, seed = (now ^ 0x9e3779b9) | 0): GameState {
  return {
    scrap: 20,
    copper: 0,
    cores: 0,
    modules: [
      { uid: 'm1', defId: 'drill', level: 1, pos: { x: 0, y: 1, rot: 0 } },
      { uid: 'm2', defId: 'battery', level: 1, pos: { x: 2, y: 1, rot: 0 } },
    ],
    blueprints: ['drill', 'battery', 'plate', 'cargo'],
    buildings: { workshop: 1, storage: 0, dock: 0, radio: 0, forge: 0 },
    robot: { hp: BASE_HP, shield: 0, shieldDelay: 0 },
    exp: null,
    tierUnlocked: 1,
    selectedTier: 1,
    autopilot: { priority: ['cache', 'fight', 'rest', 'event', 'elite'], returnHpPct: 35, returnWhenFull: true, avoidEliteHpPct: 0, relaunch: false },
    flags: [],
    combos: [],
    lore: 0,
    seenEnemies: [],
    journal: [{ t: now, k: 'j.wake' }],
    lastReport: null,
    stats: emptyStats(),
    rngState: seed,
    nextUid: 3,
    settings: { lang: '', introSeen: false, sfx: true, volume: 0.6, reducedMotion: false },
    timestamps: { created: now, lastSaved: now, lastTick: now },
  };
}

export const newUid = (s: GameState): string => `m${s.nextUid++}`;

/** Params whose value starts with '@' are translation keys resolved at display time. */
export function journal(s: GameState, t: number, k: string, p?: Record<string, string | number>): void {
  s.journal.push(p ? { t, k, p } : { t, k });
  if (s.journal.length > 80) s.journal.splice(0, s.journal.length - 80);
}
