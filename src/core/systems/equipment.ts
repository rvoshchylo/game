import { DROPPABLE_ITEMS, FORGE_COST, INVENTORY_CAP, itemById, RARITIES, RARITY_WEIGHTS, SALVAGE_VALUE } from '../../data/items';
import type { Rarity, SlotId } from '../../data/types';
import type { Ctx } from '../context';
import { nextRandom, weightedPick } from '../rng';
import { newUid, type ItemInstance } from '../state';
import { SLOTS } from '../stats';

export const DROP_CHANCE = 0.02;
export const DROP_MIN_DEPTH = 3;

export function rollRarity(ctx: Ctx, min: Rarity = 'common'): Rarity {
  const r = weightedPick(ctx.s, RARITIES, (x) => RARITY_WEIGHTS[x]);
  return RARITIES.indexOf(r) < RARITIES.indexOf(min) ? min : r;
}

export const isEquipped = (ctx: Ctx, uid: string): boolean => SLOTS.some((sl) => ctx.s.equipped[sl] === uid);

export const looseItems = (ctx: Ctx): ItemInstance[] => ctx.s.inventory.filter((i) => !isEquipped(ctx, i.uid));

/** Returns the new instance, or null if the rig was full (auto-salvaged). */
export function grantItem(ctx: Ctx, defId: string, rarity: Rarity, source: 'drop' | 'forge' | 'boss' | 'probe' | 'signal'): ItemInstance | null {
  const s = ctx.s;
  s.stats.itemsFound++;
  if (!s.codex.includes(defId)) s.codex.push(defId);
  if (looseItems(ctx).length >= INVENTORY_CAP) {
    s.shards += SALVAGE_VALUE[rarity];
    ctx.bus.emit('error', { text: `Rig full — ${itemById(defId).name} salvaged for ${SALVAGE_VALUE[rarity]} Shards` });
    return null;
  }
  const item: ItemInstance = { uid: newUid(s), defId, rarity };
  s.inventory.push(item);
  ctx.bus.emit('itemFound', { item, source });
  return item;
}

export function randomDroppable(ctx: Ctx): string {
  return DROPPABLE_ITEMS[Math.floor(nextRandom(ctx.s) * DROPPABLE_ITEMS.length)].id;
}

export function rollDrop(ctx: Ctx): void {
  const s = ctx.s;
  if (s.depth < DROP_MIN_DEPTH) return;
  const pity = s.stats.itemsFound === 0 && s.depth >= 4;
  if (pity || nextRandom(s) < DROP_CHANCE) grantItem(ctx, randomDroppable(ctx), rollRarity(ctx), 'drop');
}

export function slotKind(slot: SlotId): 'core' | 'module' | 'utility' {
  if (slot === 'core') return 'core';
  return slot.startsWith('module') ? 'module' : 'utility';
}

export function slotAvailable(ctx: Ctx, slot: SlotId): boolean {
  return slot !== 'utility2' || ctx.stats.grants.has('utility2');
}

export function equip(ctx: Ctx, uid: string, slot: SlotId): boolean {
  const s = ctx.s;
  const item = s.inventory.find((i) => i.uid === uid);
  if (!item || !slotAvailable(ctx, slot)) return false;
  if (itemById(item.defId).slot !== slotKind(slot)) return false;
  for (const sl of SLOTS) if (s.equipped[sl] === uid) s.equipped[sl] = null;
  s.equipped[slot] = uid;
  if (!s.equipped.core) s.equipped.core = s.inventory.find((i) => itemById(i.defId).slot === 'core' && !isEquipped(ctx, i.uid))?.uid ?? null;
  ctx.invalidate();
  return true;
}

export function unequip(ctx: Ctx, slot: SlotId): boolean {
  if (slot === 'core') return false;
  ctx.s.equipped[slot] = null;
  ctx.invalidate();
  return true;
}

export function salvage(ctx: Ctx, uid: string): boolean {
  const s = ctx.s;
  const item = s.inventory.find((i) => i.uid === uid);
  if (!item || isEquipped(ctx, uid) || item.defId === 'piston_bit') return false;
  s.inventory = s.inventory.filter((i) => i.uid !== uid);
  if (s.heirloomUid === uid) s.heirloomUid = null;
  s.shards += SALVAGE_VALUE[item.rarity];
  return true;
}

export function forge(ctx: Ctx): boolean {
  const s = ctx.s;
  if (!s.flags.includes('forge') || s.shards < FORGE_COST) return false;
  if (looseItems(ctx).length >= INVENTORY_CAP) {
    ctx.bus.emit('error', { text: 'Rig is full — salvage something first' });
    return false;
  }
  s.shards -= FORGE_COST;
  s.stats.itemsForged++;
  grantItem(ctx, randomDroppable(ctx), rollRarity(ctx), 'forge');
  return true;
}
