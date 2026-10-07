// Content definitions. Adding an enemy / boss / item / upgrade = adding a data object,
// never editing a system.

export type Rarity = 'common' | 'rare' | 'epic' | 'relic';
export type ItemSlotKind = 'core' | 'module' | 'utility';
export type SlotId = 'core' | 'module1' | 'module2' | 'utility' | 'utility2';

/** Every number a build can change. Base values live in core/stats.ts. */
export type StatKey =
  | 'strikeMul'
  | 'autoMul'
  | 'fractureMul'
  | 'fractureFreqMul'
  | 'fractureShards'
  | 'scrapMul'
  | 'integrityMul'
  | 'regenPct'
  | 'strikeIntegrityCost'
  | 'governorChance'
  | 'heatFromAuto'
  | 'signalMul'
  | 'rareMul'
  | 'probeSlots'
  | 'killsPerDepthDelta'
  | 'ventHeal'
  | 'ventDurationAdd'
  | 'tollHeat'
  | 'enemyHpMul'
  | 'echoMul'
  | 'probeTimeMul';

export interface Effect {
  stat: StatKey;
  op: 'add' | 'mul';
  value: number;
  /** Rarity scales only the beneficial side of an effect. */
  scales?: boolean;
}

/** Metrics are named numbers derived from state; unlocks and achievements are conditions on them. */
export type MetricKey =
  | 'maxDepth'
  | 'bestDepth'
  | 'totalScrap'
  | 'fracturesHit'
  | 'retreats'
  | 'itemsFound'
  | 'ventsUsed'
  | 'probesSent'
  | 'wardens'
  | 'collapses'
  | 'logsFound'
  | 'kills'
  | 'shardsEarned'
  | 'countersTolled'
  | 'signalsTapped'
  | 'itemsForged';

export interface Condition {
  metric: MetricKey;
  gte: number;
}

export interface EnemyVisual {
  shape: 'mite' | 'crawler' | 'wisp' | 'golem' | 'worm' | 'bell';
  color: number;
  /** On-screen size in logical px. */
  size: number;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  hpMul: number;
  atkMul: number;
  /** Seconds between attacks. */
  attackInterval: number;
  scrapMul: number;
  /** Seconds between fractures. */
  fractureInterval: number;
  /** Seconds a fracture stays open. */
  fractureLifetime: number;
  minDepth: number;
  weight: number;
  rare?: { fleeAfter: number; shards: number; logChance: number };
  visual: EnemyVisual;
}

export type BossRuleKind = 'autoMul' | 'strikeMul' | 'fractureMul' | 'tollInterval';
export interface BossRule {
  kind: BossRuleKind;
  value: number;
}
export interface BossPhase {
  /** Phase is active while hp ratio is at or below this value. */
  below: number;
  name: string;
  description: string;
  /** Vent suppresses phases marked as shells. */
  shell?: boolean;
  rules: BossRule[];
}

export interface BossDefinition {
  id: string;
  name: string;
  title: string;
  hpMul: number;
  /** Seconds before the shaft gives way and the fight is lost. */
  timer: number;
  tags: string[];
  tollInterval: number;
  /** Fraction of max integrity per toll. */
  tollDamagePct: number;
  /** Seconds before a toll during which a tap counters it. */
  tollWindow: number;
  fractureInterval: number;
  fractureLifetime: number;
  scrapMul: number;
  shardReward: number;
  firstKillItem: string;
  phases: BossPhase[];
  visual: EnemyVisual;
}

export interface ItemDefinition {
  id: string;
  name: string;
  slot: ItemSlotKind;
  /** Short playstyle line. */
  description: string;
  effects: Effect[];
  /** Unique items never come from forge/drops. */
  unique?: boolean;
  archetype: string;
}

export type UpgradeId = 'servo' | 'motor' | 'plating' | 'exchanger' | 'hopper' | 'hull';

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  description: string;
  baseCost: number;
  growth: number;
  max?: number;
  /** UI flag that reveals the upgrade. null = visible from the start. */
  flag: string | null;
}

export interface SkillDefinition {
  id: string;
  name: string;
  heatCost: number;
  baseDuration: number;
  damageMul: number;
  fractureRateMul: number;
}

export interface ZoneDefinition {
  id: string;
  name: string;
  fromDepth: number;
  palette: { bg: number; rock: number; rockLight: number; accent: number };
  enemies: string[];
  bossId: string;
  bossEvery: number;
}

export interface ExpeditionDefinition {
  id: string;
  name: string;
  description: string;
  /** Seconds. */
  duration: number;
  risk: number;
  costMul: number;
  unlock: Condition | { flag: string };
  rewards: {
    scrapKills: number;
    shards: number;
    itemChance: number;
    minRarity: Rarity;
    logChance: number;
  };
}

export interface StanceDefinition {
  id: string;
  name: string;
  riskMul: number;
  rewardMul: number;
}

export interface UnlockRule {
  flag: string;
  when: Condition[];
  /** Shown as a toast when the system reveals itself. */
  message: string;
  /** Hint shown on the locked "faint signal" placeholder. */
  hint?: string;
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  metric: MetricKey;
  threshold: number;
  rewardShards: number;
}

export interface MemoryDefinition {
  id: string;
  name: string;
  cost: number;
  description: string;
  effects: Effect[];
  /** Behaviour switches read by systems. */
  grants: string[];
}

export interface DoctrineDefinition {
  id: string;
  name: string;
  description: string;
  effects: Effect[];
}

export interface LogDefinition {
  id: string;
  /** Found on reaching this depth; undefined = only from probes/rare events. */
  depth?: number;
  text: string;
}

export interface SignalOutcome {
  id: 'cache' | 'vein' | 'ghost' | 'module';
  weight: number;
}
