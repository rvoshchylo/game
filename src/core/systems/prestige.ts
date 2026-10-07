import { itemById } from '../../data/items';
import { DOCTRINES, memoryById } from '../../data/memories';
import type { SlotId } from '../../data/types';
import type { Ctx } from '../context';
import { echoesFor, SHARD_KEEP_ON_COLLAPSE } from '../formulas';
import { STARTER_ITEM_UID, type ItemInstance } from '../state';
import { discoverLog } from './discovery';

export const collapseReward = (ctx: Ctx): number => echoesFor(ctx.s.maxDepth, ctx.s.runWardens, ctx.stats.echoMul);

export function collapse(ctx: Ctx, doctrineId: string): number {
  const s = ctx.s;
  if (!s.flags.includes('collapse')) return -1;
  if (!DOCTRINES.some((d) => d.id === doctrineId)) return -1;
  const gained = collapseReward(ctx);
  const grants = ctx.stats.grants;

  s.echoes += gained;
  s.stats.echoesEarned += gained;
  s.stats.collapses++;

  const starter: ItemInstance = s.inventory.find((i) => i.uid === STARTER_ITEM_UID) ?? { uid: STARTER_ITEM_UID, defId: 'piston_bit', rarity: 'common' };
  const heirloom = grants.has('heirloom') && s.heirloomUid ? s.inventory.find((i) => i.uid === s.heirloomUid) : undefined;

  s.depth = 1;
  s.maxDepth = 1;
  s.kills = 0;
  s.mode = 'push';
  s.scrap = 0;
  s.shards = Math.floor(s.shards * SHARD_KEEP_ON_COLLAPSE);
  s.heat = 0;
  s.ventTime = 0;
  s.rustDebt = 0;
  s.chain = 0;
  s.enemy = null;
  s.spawnDelay = 0.8;
  s.upgrades = { servo: 0, motor: 0, plating: 0, exchanger: 0, hopper: 0, hull: 0 };
  s.inventory = heirloom && heirloom.uid !== starter.uid ? [starter, heirloom] : [starter];
  s.equipped = { core: starter.uid, module1: null, module2: null, utility: null, utility2: null };
  if (heirloom && heirloom.uid !== starter.uid) {
    const kind = itemById(heirloom.defId).slot;
    const slot: SlotId = kind === 'core' ? 'core' : kind === 'module' ? 'module1' : 'utility';
    s.equipped[slot] = heirloom.uid;
  } else {
    s.heirloomUid = null;
  }
  s.probes = [];
  s.signal = null;
  s.ghostFractures = 0;
  s.pushReflexTimer = 0;
  s.runWardens = 0;
  s.clearedWardens = [];
  s.doctrine = doctrineId;

  if (grants.has('muscleMemory')) {
    s.upgrades.servo = 5;
    s.upgrades.motor = 5;
  }
  if (grants.has('deepStart') && s.bestDepth >= 15) {
    s.depth = 5;
    s.maxDepth = 5;
  }
  s.stats.maxDepth = s.maxDepth;

  ctx.invalidate();
  s.integrity = ctx.stats.maxIntegrity;
  discoverLog(ctx, 'log_collapse');
  ctx.bus.emit('collapsed', { echoes: gained });
  return gained;
}

export function buyMemory(ctx: Ctx, id: string): boolean {
  const s = ctx.s;
  const m = memoryById(id);
  if (s.memories.includes(id) || s.echoes < m.cost) return false;
  s.echoes -= m.cost;
  s.memories.push(id);
  ctx.invalidate();
  return true;
}

export function setHeirloom(ctx: Ctx, uid: string | null): boolean {
  if (!ctx.stats.grants.has('heirloom')) return false;
  if (uid && !ctx.s.inventory.some((i) => i.uid === uid)) return false;
  ctx.s.heirloomUid = uid;
  return true;
}
