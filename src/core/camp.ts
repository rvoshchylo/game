import { buildingById, DOCK_REPAIR } from '../data/buildings';
import { COMBOS } from '../data/lore';
import { MAX_MODULE_LEVEL, mergeCost, moduleById } from '../data/modules';
import type { Cost } from '../data/types';
import { UNLOCKS } from '../data/unlocks';
import type { Ctx } from './context';
import { launch } from './expedition';
import { canPlace } from './grid';
import { journal, newUid, type Autopilot, type GameState, type Placement } from './state';

export const canAfford = (s: GameState, c: Cost): boolean => (c.scrap ?? 0) <= s.scrap && (c.copper ?? 0) <= s.copper && (c.cores ?? 0) <= s.cores;

function pay(s: GameState, c: Cost): void {
  s.scrap -= c.scrap ?? 0;
  s.copper -= c.copper ?? 0;
  s.cores -= c.cores ?? 0;
}

const atCamp = (ctx: Ctx): boolean => {
  if (ctx.s.exp) {
    ctx.bus.emit('error', { text: 'The robot is out in the shaft. Rebuild it when it is back.' });
    return false;
  }
  return true;
};

// ── Buildings ───────────────────────────────────────────────────────────────

export const buildingVisible = (s: GameState, id: string): boolean => {
  const b = buildingById(id);
  return b.flag === null || s.flags.includes(b.flag);
};

/** Cost of the next level, or null when maxed. */
export function nextBuildCost(s: GameState, id: string): Cost | null {
  const b = buildingById(id);
  const lvl = s.buildings[id] ?? 0;
  return lvl < b.levels.length ? b.levels[lvl].cost : null;
}

export function build(ctx: Ctx, id: string): boolean {
  const s = ctx.s;
  const cost = nextBuildCost(s, id);
  if (!buildingVisible(s, id) || !cost || !canAfford(s, cost)) return false;
  if (id === 'workshop' && !atCamp(ctx)) return false;
  pay(s, cost);
  s.buildings[id] = (s.buildings[id] ?? 0) + 1;
  const b = buildingById(id);
  journal(s, ctx.now, `${b.name} ${s.buildings[id] === 1 ? 'built' : `upgraded to level ${s.buildings[id]}`}: ${b.levels[s.buildings[id] - 1].text}`);
  ctx.bus.emit('built', { id, level: s.buildings[id] });
  ctx.invalidate();
  return true;
}

// ── Modules ─────────────────────────────────────────────────────────────────

export function craft(ctx: Ctx, defId: string): boolean {
  const s = ctx.s;
  const def = moduleById(defId);
  if (!s.blueprints.includes(defId) || !canAfford(s, def.cost)) return false;
  pay(s, def.cost);
  const module = { uid: newUid(s), defId, level: 1, pos: null };
  s.modules.push(module);
  s.stats.modulesCrafted++;
  ctx.bus.emit('crafted', { module });
  return true;
}

/** Twin of `uid` that can be merged into it (same type and level, not placed). */
export function mergePartner(s: GameState, uid: string): string | null {
  const m = s.modules.find((x) => x.uid === uid);
  if (!m || m.level >= MAX_MODULE_LEVEL) return null;
  return s.modules.find((x) => x.uid !== uid && x.defId === m.defId && x.level === m.level && !x.pos)?.uid ?? null;
}

export function merge(ctx: Ctx, uid: string): boolean {
  const s = ctx.s;
  if ((s.buildings.forge ?? 0) < 1 || !atCamp(ctx)) return false;
  const m = s.modules.find((x) => x.uid === uid);
  const partner = mergePartner(s, uid);
  if (!m || !partner) return false;
  const cost = { scrap: mergeCost(m.level) };
  if (!canAfford(s, cost)) return false;
  pay(s, cost);
  s.modules = s.modules.filter((x) => x.uid !== partner);
  m.level++;
  s.stats.merges++;
  journal(s, ctx.now, `Forged ${moduleById(m.defId).name} to level ${m.level}.`);
  ctx.bus.emit('merged', { module: m });
  ctx.invalidate();
  return true;
}

export const salvageValue = (defId: string, level: number): number => Math.floor(((moduleById(defId).cost.scrap ?? 0) / 2) * level);

export function salvage(ctx: Ctx, uid: string): boolean {
  const s = ctx.s;
  if (!atCamp(ctx)) return false;
  const m = s.modules.find((x) => x.uid === uid);
  if (!m) return false;
  s.modules = s.modules.filter((x) => x.uid !== uid);
  s.scrap += salvageValue(m.defId, m.level);
  ctx.invalidate();
  return true;
}

export function place(ctx: Ctx, uid: string, p: Placement): boolean {
  if (!atCamp(ctx)) return false;
  const m = ctx.s.modules.find((x) => x.uid === uid);
  if (!m || !canPlace(ctx.s, uid, p)) return false;
  m.pos = { x: p.x, y: p.y, rot: ((p.rot % 4) + 4) % 4 };
  ctx.invalidate();
  return true;
}

export function unplace(ctx: Ctx, uid: string): boolean {
  if (!atCamp(ctx)) return false;
  const m = ctx.s.modules.find((x) => x.uid === uid);
  if (!m || !m.pos) return false;
  m.pos = null;
  ctx.invalidate();
  return true;
}

export function setAutopilot(ctx: Ctx, patch: Partial<Autopilot>): boolean {
  const ap = ctx.s.autopilot;
  if (patch.priority && patch.priority.length === ap.priority.length) ap.priority = [...patch.priority];
  if (patch.returnHpPct !== undefined) ap.returnHpPct = Math.max(0, Math.min(80, Math.round(patch.returnHpPct)));
  if (patch.returnWhenFull !== undefined) ap.returnWhenFull = patch.returnWhenFull;
  if (patch.avoidEliteHpPct !== undefined) ap.avoidEliteHpPct = Math.max(0, Math.min(100, Math.round(patch.avoidEliteHpPct)));
  if (patch.relaunch !== undefined) ap.relaunch = patch.relaunch;
  return true;
}

// ── Camp tick, unlocks, discoveries ─────────────────────────────────────────

export function tickCamp(ctx: Ctx, dt: number): void {
  const s = ctx.s;
  if (s.exp) return;
  const r = s.robot;
  const rate = DOCK_REPAIR[Math.min(s.buildings.dock ?? 0, DOCK_REPAIR.length - 1)];
  r.hp = Math.min(ctx.rig.maxHp, r.hp + ctx.rig.maxHp * rate * dt);
  r.shield = ctx.rig.shieldMax;
  r.shieldDelay = 0;
  if ((s.buildings.radio ?? 0) >= 3 && s.autopilot.relaunch && r.hp >= ctx.rig.maxHp * 0.95 && ctx.rig.weapons.length) launch(ctx, s.selectedTier);
}

export function checkUnlocks(ctx: Ctx): void {
  const s = ctx.s;
  for (const u of UNLOCKS) {
    if (s.flags.includes(u.flag) || s.stats[u.metric] < u.gte) continue;
    s.flags.push(u.flag);
    journal(s, ctx.now, u.message);
    ctx.bus.emit('unlock', { flag: u.flag, message: u.message });
  }
}

export function checkCombos(ctx: Ctx): void {
  for (const id of ctx.rig.combos) {
    if (ctx.s.combos.includes(id)) continue;
    ctx.s.combos.push(id);
    const c = COMBOS.find((x) => x.id === id)!;
    journal(ctx.s, ctx.now, `Discovery — ${c.name}: ${c.text}`);
    ctx.bus.emit('combo', { id, name: c.name });
  }
}
