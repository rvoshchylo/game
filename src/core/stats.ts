import { doctrineById, memoryById } from '../data/memories';
import { itemById, RARITY_SCALE } from '../data/items';
import type { Effect, SlotId, StatKey } from '../data/types';
import { VENT } from '../data/skills';
import * as F from './formulas';
import type { GameState, ItemInstance } from './state';

export type StatBlock = Record<StatKey, number>;

const BASE: StatBlock = {
  strikeMul: 1,
  autoMul: 1,
  fractureMul: 1,
  fractureFreqMul: 1,
  fractureShards: 1,
  scrapMul: 1,
  integrityMul: 1,
  regenPct: 0,
  strikeIntegrityCost: 0,
  governorChance: 0,
  heatFromAuto: 0,
  signalMul: 1,
  rareMul: 1,
  probeSlots: 1,
  killsPerDepthDelta: 0,
  ventHeal: 0,
  ventDurationAdd: 0,
  tollHeat: 0,
  enemyHpMul: 1,
  echoMul: 1,
  probeTimeMul: 1,
};

export interface Stats extends StatBlock {
  strike: number;
  autoDps: number;
  maxIntegrity: number;
  regen: number;
  ventDuration: number;
  killsPerDepth: number;
  offlineCapHours: number;
  /** Damage bonus from unspent Echoes. */
  resonance: number;
  grants: Set<string>;
}

export function applyEffect(block: StatBlock, e: Effect, scale = 1): void {
  if (e.op === 'add') {
    block[e.stat] += e.value * (e.scales ? scale : 1);
  } else {
    const v = e.scales ? 1 + (e.value - 1) * scale : e.value;
    block[e.stat] *= v;
  }
}

export function itemInstance(s: GameState, uid: string | null): ItemInstance | undefined {
  return uid ? s.inventory.find((i) => i.uid === uid) : undefined;
}

export const SLOTS: SlotId[] = ['core', 'module1', 'module2', 'utility', 'utility2'];

export function computeStats(s: GameState): Stats {
  const block: StatBlock = { ...BASE };
  const grants = new Set<string>();

  for (const slot of SLOTS) {
    const inst = itemInstance(s, s.equipped[slot]);
    if (!inst) continue;
    const def = itemById(inst.defId);
    for (const e of def.effects) applyEffect(block, e, RARITY_SCALE[inst.rarity]);
  }
  for (const id of s.memories) {
    const m = memoryById(id);
    for (const e of m.effects) applyEffect(block, e);
    for (const g of m.grants) grants.add(g);
  }
  for (const e of doctrineById(s.doctrine).effects) applyEffect(block, e);

  block.governorChance = Math.min(0.95, block.governorChance);
  const maxInt = F.maxIntegrity(s.upgrades.plating) * block.integrityMul;
  const resonance = F.echoResonance(s.echoes);

  return {
    ...block,
    strike: F.strikeDamage(s.upgrades.servo) * block.strikeMul * resonance,
    autoDps: F.autoDps(s.upgrades.motor) * block.autoMul * resonance,
    resonance,
    maxIntegrity: maxInt,
    regen: F.baseRegen(maxInt) + block.regenPct * maxInt,
    ventDuration: VENT.baseDuration + 0.5 * s.upgrades.exchanger + block.ventDurationAdd,
    killsPerDepth: Math.max(2, F.BASE_KILLS_PER_DEPTH + block.killsPerDepthDelta),
    offlineCapHours: F.offlineCapHours(s.upgrades.hopper),
    grants,
  };
}
