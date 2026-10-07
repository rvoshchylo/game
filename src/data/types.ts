// Content definitions. New modules, enemies, buildings, events = new data, not new systems.

export type ShapeId = '1' | '2' | 'L' | '2x2';
export type ModuleKind = 'weapon' | 'power' | 'cooling' | 'armor' | 'shield' | 'repair' | 'cargo' | 'utility';

export interface Cost {
  scrap?: number;
  copper?: number;
  cores?: number;
}

export interface ModuleDef {
  id: string;
  name: string;
  kind: ModuleKind;
  shape: ShapeId;
  /** +produces / −consumes power. */
  power: number;
  /** Frame in the Kenney 1-Bit sheet. */
  icon: number;
  color: string;
  description: string;
  /** Short line about what neighbours do to / for it. */
  synergy?: string;
  cost: Cost;
  /** Known from the start (no blueprint needed). */
  starter?: boolean;
  // stats (level 1)
  damage?: number;
  interval?: number;
  pierce?: boolean;
  aoe?: boolean;
  armor?: number;
  hp?: number;
  shield?: number;
  shieldRegen?: number;
  repair?: number;
  cargo?: number;
  scrapBonus?: number;
  keepOnBreak?: number;
  extraChoice?: number;
}

export interface EnemyDef {
  id: string;
  name: string;
  /** Frame in the Kenney Tiny Dungeon sheet; -1 = procedural (boss). */
  frame: number;
  hp: number;
  damage: number;
  interval: number;
  armor: number;
}

export interface BossDef extends EnemyDef {
  title: string;
  tags: string[];
  /** True damage to the robot every `tollInterval` seconds (shields absorb it). */
  tollDamage: number;
  tollInterval: number;
  /** Below this HP ratio the boss gains `phase2Armor`. */
  phase2At: number;
  phase2Armor: number;
  profile: string[];
}

export type NodeType = 'fight' | 'elite' | 'cache' | 'rest' | 'event' | 'boss';

export interface StratumDef {
  id: string;
  name: string;
  layers: number;
  enemies: string[];
  elites: string[];
  bossId: string;
  nodeWeights: Record<Exclude<NodeType, 'boss'>, number>;
  palette: { bg: number; rock: number; rockLight: number; accent: number };
}

export interface BuildingLevel {
  cost: Cost;
  /** What this level changes, shown to the player. */
  text: string;
}

export interface BuildingDef {
  id: string;
  name: string;
  icon: number;
  description: string;
  /** Unlock flag that reveals the construction site; null = available from start. */
  flag: string | null;
  levels: BuildingLevel[];
}

export type EventEffect =
  | { kind: 'crate'; scrap: number; copper: number }
  | { kind: 'damage'; pct: number }
  | { kind: 'heal'; pct: number }
  | { kind: 'blueprint' }
  | { kind: 'lore' }
  | { kind: 'nothing' };

export interface EventOption {
  label: string;
  chance: number;
  success: EventEffect[];
  fail: EventEffect[];
  successText: string;
  failText: string;
}

export interface EventDef {
  id: string;
  text: string;
  options: EventOption[];
  /** Option index autopilot takes (the safe one). */
  safe: number;
}

export type MetricKey =
  | 'expeditions'
  | 'breakdowns'
  | 'fightsWon'
  | 'elitesWon'
  | 'bossesWon'
  | 'modulesCrafted'
  | 'merges'
  | 'deepestLayer'
  | 'cratesLost';

export interface UnlockRule {
  flag: string;
  metric: MetricKey;
  gte: number;
  message: string;
}
