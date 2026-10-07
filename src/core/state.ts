import type { MetricKey, Rarity, SlotId, UpgradeId } from '../data/types';

export interface FractureState {
  id: number;
  nx: number;
  ny: number;
  life: number;
  maxLife: number;
  /** Remaining life at which the governor strikes it; null = not governed. */
  govAt: number | null;
}

export interface EnemyState {
  defId: string;
  isBoss: boolean;
  hp: number;
  maxHp: number;
  attackTimer: number;
  fractureTimer: number;
  fracture: FractureState | null;
  age: number;
  bossPhase: number;
  tollTimer: number;
  tollWarned: boolean;
  tollCountered: boolean;
  bossTimer: number;
}

export interface ItemInstance {
  uid: string;
  defId: string;
  rarity: Rarity;
}

export interface ProbeOutcome {
  success: boolean;
  scrap: number;
  shards: number;
  item: { defId: string; rarity: Rarity } | null;
  logId: string | null;
}

export interface ProbeRun {
  uid: string;
  destId: string;
  stanceId: string;
  startedAt: number;
  durationMs: number;
  cost: number;
  risk: number;
  /** Rolled at launch: reloading never changes the result. */
  outcome: ProbeOutcome;
  notified: boolean;
}

export interface SignalState {
  nx: number;
  ny: number;
  life: number;
}

export interface Settings {
  sfx: boolean;
  volume: number;
  reducedMotion: boolean;
}

export type LifetimeStat = MetricKey | 'clockAnomalies' | 'totalDamage' | 'echoesEarned';

export interface GameState {
  /** Run state */
  depth: number;
  maxDepth: number;
  kills: number;
  mode: 'push' | 'hold';
  scrap: number;
  shards: number;
  integrity: number;
  heat: number;
  ventTime: number;
  rustDebt: number;
  chain: number;
  spawnDelay: number;
  enemy: EnemyState | null;
  upgrades: Record<UpgradeId, number>;
  equipped: Record<SlotId, string | null>;
  inventory: ItemInstance[];
  probes: ProbeRun[];
  signal: SignalState | null;
  nextSignalIn: number;
  ghostFractures: number;
  pushReflexTimer: number;
  runWardens: number;
  /** Warden depths broken this run — they stay open until Collapse. */
  clearedWardens: number[];
  autoDamageAcc: number;
  autoDamageTimer: number;

  /** Meta state (survives Collapse) */
  bestDepth: number;
  echoes: number;
  memories: string[];
  doctrine: string;
  heirloomUid: string | null;
  flags: string[];
  logs: string[];
  codex: string[];
  achievements: string[];
  stats: Record<LifetimeStat, number>;

  /** System */
  rngState: number;
  nextUid: number;
  fractureSeq: number;
  settings: Settings;
  timestamps: { created: number; lastSaved: number; lastTick: number };
}

export const emptyStats = (): Record<LifetimeStat, number> => ({
  maxDepth: 1,
  bestDepth: 1,
  totalScrap: 0,
  fracturesHit: 0,
  retreats: 0,
  itemsFound: 0,
  ventsUsed: 0,
  probesSent: 0,
  wardens: 0,
  collapses: 0,
  logsFound: 0,
  kills: 0,
  shardsEarned: 0,
  countersTolled: 0,
  signalsTapped: 0,
  itemsForged: 0,
  clockAnomalies: 0,
  totalDamage: 0,
  echoesEarned: 0,
});

export const STARTER_ITEM_UID = 'i0';

export function createInitialState(now: number, seed = (now ^ 0x9e3779b9) | 0): GameState {
  return {
    depth: 1,
    maxDepth: 1,
    kills: 0,
    mode: 'push',
    scrap: 0,
    shards: 0,
    integrity: 20,
    heat: 0,
    ventTime: 0,
    rustDebt: 0,
    chain: 0,
    spawnDelay: 0,
    enemy: null,
    upgrades: { servo: 0, motor: 0, plating: 0, exchanger: 0, hopper: 0, hull: 0 },
    equipped: { core: STARTER_ITEM_UID, module1: null, module2: null, utility: null, utility2: null },
    inventory: [{ uid: STARTER_ITEM_UID, defId: 'piston_bit', rarity: 'common' }],
    probes: [],
    signal: null,
    nextSignalIn: 90,
    ghostFractures: 0,
    pushReflexTimer: 0,
    runWardens: 0,
    clearedWardens: [],
    autoDamageAcc: 0,
    autoDamageTimer: 0,

    bestDepth: 1,
    echoes: 0,
    memories: [],
    doctrine: 'none',
    heirloomUid: null,
    flags: [],
    logs: [],
    codex: ['piston_bit'],
    achievements: [],
    stats: emptyStats(),

    rngState: seed,
    nextUid: 1,
    fractureSeq: 0,
    settings: { sfx: true, volume: 0.6, reducedMotion: false },
    timestamps: { created: now, lastSaved: now, lastTick: now },
  };
}

export const hasFlag = (s: GameState, flag: string): boolean => s.flags.includes(flag);

export const newUid = (s: GameState): string => `i${s.nextUid++}`;
