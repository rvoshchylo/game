import { STORAGE_CAPS } from '../data/buildings';
import { bossById } from '../data/enemies';
import { eventById, EVENTS } from '../data/events';
import { LORE } from '../data/lore';
import { MODULES, moduleById } from '../data/modules';
import { stratumById } from '../data/strata';
import type { EventEffect, NodeType } from '../data/types';
import { makeEnemy, startFight, tickFight, tickRobotField } from './combat';
import type { Ctx } from './context';
import { nextRandom, weightedPick } from './rng';
import { journal, type Crate, type EnemyState, type Expedition, type MapNode } from './state';

export const WALK_TIME = 4;
export const CACHE_TIME = 3;
export const REST_TIME = 4;
export const RETURN_TIME = 4;
export const CHOICE_WAIT = 12;
export const EVENT_WAIT = 15;
export const REST_HEAL = 0.35;
export const MIN_LAUNCH_HP = 0.25;
export const STRATUM_ID = 'rust';
export const CACHE_BLUEPRINT_CHANCE = 0.25;
/** The very first expedition is a short guided path with no forks and no Warden. */
const FIRST_MAP: NodeType[] = ['fight', 'cache', 'fight', 'rest', 'fight'];

export const lootTier = (tier: number): number => Math.pow(1.6, tier - 1);

const NODE_LABEL: Record<NodeType, string> = {
  fight: 'Fight',
  elite: 'Elite',
  cache: 'Cache',
  rest: 'Rest',
  event: 'Event',
  boss: 'Warden',
};
export const nodeLabel = (t: NodeType): string => NODE_LABEL[t];

// ── Map ─────────────────────────────────────────────────────────────────────

export function generateMap(ctx: Ctx, firstEver: boolean): MapNode[][] {
  const st = stratumById(STRATUM_ID);
  const map: MapNode[][] = [];
  if (firstEver) return FIRST_MAP.map((t) => [{ type: t }]);
  const width = Math.min(4, 2 + ctx.rig.extraChoices);
  for (let layer = 0; layer < st.layers; layer++) {
    if (layer === st.layers - 1) {
      map.push([{ type: 'boss' }]);
      continue;
    }
    const nodes: MapNode[] = [];
    for (let i = 0; i < width; i++) {
      let type: NodeType;
      if (layer === 0 && i === 0) type = 'fight';
      else {
        const pool = (Object.keys(st.nodeWeights) as Exclude<NodeType, 'boss'>[]).filter((t) => !(t === 'elite' && layer < 2) && !(t === 'rest' && layer === 0));
        type = weightedPick(ctx.s, pool, (t) => st.nodeWeights[t]);
      }
      const node: MapNode = { type };
      if (type === 'event') node.eventId = EVENTS[Math.floor(nextRandom(ctx.s) * EVENTS.length)].id;
      nodes.push(node);
    }
    map.push(nodes);
  }
  return map;
}

// ── Launch / recall ─────────────────────────────────────────────────────────

export function canLaunch(ctx: Ctx): string | null {
  const s = ctx.s;
  if (s.exp) return 'The robot is already out.';
  if (!ctx.rig.weapons.length) return 'Install at least one weapon.';
  if (s.robot.hp < ctx.rig.maxHp * MIN_LAUNCH_HP) return 'The robot needs repairs first.';
  return null;
}

export function launch(ctx: Ctx, tier: number): boolean {
  const s = ctx.s;
  const err = canLaunch(ctx);
  if (err) {
    ctx.bus.emit('error', { text: err });
    return false;
  }
  const t = Math.max(1, Math.min(tier, s.tierUnlocked));
  s.selectedTier = t;
  s.robot.shield = ctx.rig.shieldMax;
  s.exp = {
    stratumId: STRATUM_ID,
    tier: t,
    map: [],
    layer: 0,
    path: [],
    phase: 'choose',
    timer: 0,
    waitTimer: CHOICE_WAIT,
    crates: [],
    blueprints: [],
    cores: 0,
    cratesLost: 0,
    fight: null,
    broken: false,
    startedAt: ctx.now,
  };
  s.exp.map = generateMap(ctx, s.stats.expeditions === 0);
  journal(s, ctx.now, `Expedition into ${stratumById(STRATUM_ID).name}${t > 1 ? ` (tier ${t})` : ''} begins.`);
  ctx.bus.emit('launched', { tier: t });
  enterChoose(ctx);
  return true;
}

export function recall(ctx: Ctx): void {
  const exp = ctx.s.exp;
  if (!exp || exp.phase === 'return') return;
  journal(ctx.s, ctx.now, 'Recall signal sent. The robot turns back with its cargo.');
  beginReturn(ctx);
}

function beginReturn(ctx: Ctx): void {
  const exp = ctx.s.exp!;
  exp.fight = null;
  exp.phase = 'return';
  exp.timer = RETURN_TIME;
  ctx.bus.emit('phase', { phase: 'return' });
}

// ── Choosing ────────────────────────────────────────────────────────────────

function enterChoose(ctx: Ctx): void {
  const exp = ctx.s.exp!;
  exp.phase = 'choose';
  exp.waitTimer = CHOICE_WAIT;
  if (exp.map[exp.layer].length === 1) {
    choose(ctx, 0);
    return;
  }
  ctx.bus.emit('choiceNeeded', {});
  ctx.bus.emit('phase', { phase: 'choose' });
}

/** What the autopilot would pick. */
export function autopilotChoice(ctx: Ctx, nodes: MapNode[]): number {
  const s = ctx.s;
  const ap = s.autopilot;
  const hpPct = (s.robot.hp / ctx.rig.maxHp) * 100;
  const restIdx = nodes.findIndex((n) => n.type === 'rest');
  if (hpPct < 50 && restIdx >= 0) return restIdx;
  let candidates = nodes.map((n, i) => ({ n, i }));
  if (s.buildings.radio >= 2 && ap.avoidEliteHpPct > 0 && hpPct < ap.avoidEliteHpPct) {
    const safe = candidates.filter((c) => c.n.type !== 'elite');
    if (safe.length) candidates = safe;
  }
  const rank = (t: NodeType) => {
    const i = ap.priority.indexOf(t as never);
    return i < 0 ? 99 : i;
  };
  candidates.sort((a, b) => rank(a.n.type) - rank(b.n.type));
  return candidates[0].i;
}

export function choose(ctx: Ctx, index: number): boolean {
  const exp = ctx.s.exp;
  if (!exp || exp.phase !== 'choose') return false;
  const nodes = exp.map[exp.layer];
  if (index < 0 || index >= nodes.length) return false;
  exp.path[exp.layer] = index;
  exp.phase = 'walk';
  exp.timer = WALK_TIME;
  ctx.bus.emit('phase', { phase: 'walk' });
  return true;
}

// ── Nodes ───────────────────────────────────────────────────────────────────

const currentNode = (exp: Expedition): MapNode => exp.map[exp.layer][exp.path[exp.layer]];

function enemiesFor(ctx: Ctx, node: MapNode): EnemyState[] {
  const exp = ctx.s.exp!;
  const st = stratumById(exp.stratumId);
  const pick = (ids: string[]) => ids[Math.floor(nextRandom(ctx.s) * ids.length)];
  if (node.type === 'boss') return [makeEnemy(st.bossId, exp.layer, exp.tier, false, true)];
  if (node.type === 'elite') {
    const list = [makeEnemy(pick(st.elites), exp.layer, exp.tier, true, false)];
    if (exp.layer >= 4) list.push(makeEnemy(pick(st.enemies), exp.layer, exp.tier, false, false));
    return list;
  }
  const count = Math.min(3, 1 + Math.floor(exp.layer / 3) + (nextRandom(ctx.s) < 0.3 ? 1 : 0));
  return Array.from({ length: count }, () => makeEnemy(pick(st.enemies), exp.layer, exp.tier, false, false));
}

function arrive(ctx: Ctx): void {
  const s = ctx.s;
  const exp = s.exp!;
  const node = currentNode(exp);
  s.stats.deepestLayer = Math.max(s.stats.deepestLayer, exp.layer + 1 + (exp.tier - 1) * 100);
  switch (node.type) {
    case 'fight':
    case 'elite':
    case 'boss':
      startFight(ctx, enemiesFor(ctx, node));
      break;
    case 'cache':
      exp.phase = 'node';
      exp.timer = CACHE_TIME;
      break;
    case 'rest':
      exp.phase = 'node';
      exp.timer = REST_TIME;
      break;
    case 'event':
      exp.phase = 'event';
      exp.waitTimer = EVENT_WAIT;
      ctx.bus.emit('eventStart', { eventId: node.eventId! });
      break;
  }
  ctx.bus.emit('phase', { phase: exp.phase });
}

function crate(ctx: Ctx, scrapBase: number, copper: number): Crate {
  const exp = ctx.s.exp!;
  return {
    scrap: Math.max(1, Math.round(scrapBase * Math.pow(1.12, exp.layer) * lootTier(exp.tier) * ctx.rig.scrapMul)),
    copper: Math.round(copper * lootTier(exp.tier)),
  };
}

function addCrate(ctx: Ctx, c: Crate): void {
  const exp = ctx.s.exp!;
  if (exp.crates.length < ctx.rig.cargo) {
    exp.crates.push(c);
    ctx.bus.emit('loot', { ...c, stored: true });
  } else {
    exp.cratesLost++;
    ctx.s.stats.cratesLost++;
    ctx.bus.emit('loot', { ...c, stored: false });
  }
}

function unknownBlueprint(ctx: Ctx): string | null {
  const known = new Set([...ctx.s.blueprints, ...(ctx.s.exp?.blueprints ?? [])]);
  const pool = MODULES.filter((m) => !known.has(m.id));
  return pool.length ? pool[Math.floor(nextRandom(ctx.s) * pool.length)].id : null;
}

function grantBlueprint(ctx: Ctx): boolean {
  const id = unknownBlueprint(ctx);
  if (!id) return false;
  ctx.s.exp!.blueprints.push(id);
  journal(ctx.s, ctx.now, `Blueprint recovered: ${moduleById(id).name}.`);
  ctx.bus.emit('blueprint', { defId: id });
  return true;
}

function grantLore(ctx: Ctx): void {
  const s = ctx.s;
  if (s.lore >= LORE.length) return;
  journal(s, ctx.now, `Echo log: “${LORE[s.lore]}”`);
  ctx.bus.emit('lore', { index: s.lore });
  s.lore++;
}

function winFight(ctx: Ctx): void {
  const s = ctx.s;
  const exp = s.exp!;
  const node = currentNode(exp);
  exp.fight = null;
  ctx.bus.emit('fightEnd', { won: true });
  const copper = nextRandom(s) < 0.35 ? 1 + Math.floor(exp.layer / 3) : 0;
  if (node.type === 'fight') {
    s.stats.fightsWon++;
    addCrate(ctx, crate(ctx, 4, copper));
  } else if (node.type === 'elite') {
    s.stats.elitesWon++;
    addCrate(ctx, crate(ctx, 8, copper + 2));
    if (!grantBlueprint(ctx)) addCrate(ctx, crate(ctx, 8, 2));
  } else if (node.type === 'boss') {
    s.stats.bossesWon++;
    const b = bossById(stratumById(exp.stratumId).bossId);
    addCrate(ctx, crate(ctx, 14, 6));
    addCrate(ctx, crate(ctx, 14, 6));
    exp.cores++;
    ctx.bus.emit('core', {});
    grantBlueprint(ctx);
    if (exp.tier === s.tierUnlocked) {
      s.tierUnlocked++;
      journal(s, ctx.now, `${b.name} falls silent. Tier ${s.tierUnlocked} of the shaft is open.`);
    } else journal(s, ctx.now, `${b.name} falls silent again.`);
  }
  afterNode(ctx);
}

function loseFight(ctx: Ctx): void {
  const s = ctx.s;
  const exp = s.exp!;
  exp.fight = null;
  exp.broken = true;
  s.robot.hp = 0;
  s.stats.breakdowns++;
  const keep = Math.floor(exp.crates.length * ctx.rig.keep);
  const lost = exp.crates.length - keep;
  exp.crates = exp.crates.slice(0, keep);
  exp.cratesLost += lost;
  journal(s, ctx.now, `The robot breaks down on layer ${exp.layer + 1}. ${lost ? `${lost} crate${lost > 1 ? 's' : ''} lost. ` : ''}It drags itself home.`);
  ctx.bus.emit('fightEnd', { won: false });
  ctx.bus.emit('breakdown', {});
  beginReturn(ctx);
}

function applyEffects(ctx: Ctx, effects: EventEffect[]): void {
  const r = ctx.s.robot;
  for (const e of effects) {
    if (e.kind === 'crate') addCrate(ctx, crate(ctx, e.scrap, e.copper));
    else if (e.kind === 'damage') r.hp = Math.max(1, r.hp - ctx.rig.maxHp * e.pct);
    else if (e.kind === 'heal') {
      const before = r.hp;
      r.hp = Math.min(ctx.rig.maxHp, r.hp + ctx.rig.maxHp * e.pct);
      ctx.bus.emit('heal', { amount: r.hp - before });
    } else if (e.kind === 'blueprint') {
      if (!grantBlueprint(ctx)) addCrate(ctx, crate(ctx, 6, 2));
    } else if (e.kind === 'lore') grantLore(ctx);
  }
}

export function eventChoice(ctx: Ctx, index: number): boolean {
  const exp = ctx.s.exp;
  if (!exp || exp.phase !== 'event') return false;
  const ev = eventById(currentNode(exp).eventId!);
  const opt = ev.options[index];
  if (!opt) return false;
  const ok = nextRandom(ctx.s) < opt.chance;
  applyEffects(ctx, ok ? opt.success : opt.fail);
  const text = ok ? opt.successText : opt.failText;
  journal(ctx.s, ctx.now, `${opt.label}: ${text}`);
  ctx.bus.emit('eventResult', { text });
  afterNode(ctx);
  return true;
}

function finishTimedNode(ctx: Ctx): void {
  const exp = ctx.s.exp!;
  const node = currentNode(exp);
  if (node.type === 'cache') {
    addCrate(ctx, crate(ctx, 5, 2 + Math.floor(exp.layer / 3)));
    addCrate(ctx, crate(ctx, 5, 1));
    if (nextRandom(ctx.s) < CACHE_BLUEPRINT_CHANCE) grantBlueprint(ctx);
  } else if (node.type === 'rest') {
    const r = ctx.s.robot;
    const before = r.hp;
    r.hp = Math.min(ctx.rig.maxHp, r.hp + ctx.rig.maxHp * REST_HEAL);
    ctx.bus.emit('heal', { amount: r.hp - before });
  }
  afterNode(ctx);
}

/** After a node: follow the return rules, or move on to the next fork. */
function afterNode(ctx: Ctx): void {
  const s = ctx.s;
  const exp = s.exp!;
  const ap = s.autopilot;
  const last = exp.layer >= exp.map.length - 1;
  const hpPct = (s.robot.hp / ctx.rig.maxHp) * 100;
  if (last) {
    journal(s, ctx.now, exp.map.length < stratumById(exp.stratumId).layers ? 'The tunnel ends. The robot heads home.' : 'The bottom of the strata. The robot heads home.');
    return beginReturn(ctx);
  }
  if (hpPct < ap.returnHpPct) {
    journal(s, ctx.now, `Hull at ${Math.round(hpPct)}% — below your ${ap.returnHpPct}% rule. Heading home.`);
    return beginReturn(ctx);
  }
  if (ap.returnWhenFull && exp.crates.length >= ctx.rig.cargo) {
    journal(s, ctx.now, 'Cargo full. Heading home.');
    return beginReturn(ctx);
  }
  exp.layer++;
  enterChoose(ctx);
}

// ── Return & deposit ────────────────────────────────────────────────────────

export function storageCap(ctx: Ctx): { scrap: number; copper: number } {
  return STORAGE_CAPS[Math.min(ctx.s.buildings.storage ?? 0, STORAGE_CAPS.length - 1)];
}

function deposit(ctx: Ctx): void {
  const s = ctx.s;
  const exp = s.exp!;
  const cap = storageCap(ctx);
  let scrap = 0;
  let copper = 0;
  for (const c of exp.crates) {
    scrap += c.scrap;
    copper += c.copper;
  }
  const scrapIn = Math.min(scrap, Math.max(0, cap.scrap - s.scrap));
  const copperIn = Math.min(copper, Math.max(0, cap.copper - s.copper));
  s.scrap += scrapIn;
  s.copper += copperIn;
  s.stats.scrapEarned += scrapIn;
  s.stats.copperEarned += copperIn;
  s.cores += exp.cores;
  for (const b of exp.blueprints) if (!s.blueprints.includes(b)) s.blueprints.push(b);
  s.stats.expeditions++;
  const bossDefeated = exp.path.length === exp.map.length && !exp.broken && currentNode(exp).type === 'boss' && exp.cores > 0;
  s.lastReport = {
    tier: exp.tier,
    layers: exp.layer + 1,
    scrap: scrapIn,
    copper: copperIn,
    cores: exp.cores,
    blueprints: [...exp.blueprints],
    broken: exp.broken,
    cratesLost: exp.cratesLost,
    overflow: scrap - scrapIn + (copper - copperIn),
    bossDefeated,
    endedAt: ctx.now,
  };
  journal(s, ctx.now, `Back at camp: +${scrapIn} scrap, +${copperIn} copper${exp.cores ? `, +${exp.cores} core` : ''}${scrap - scrapIn > 0 ? ' (storage full — some scrap left outside)' : ''}.`);
  s.exp = null;
  ctx.bus.emit('returned', { report: s.lastReport });
}

// ── Tick ────────────────────────────────────────────────────────────────────

export function tickExpedition(ctx: Ctx, dt: number): void {
  const exp = ctx.s.exp;
  if (!exp) return;
  switch (exp.phase) {
    case 'choose':
      tickRobotField(ctx, dt);
      exp.waitTimer -= dt;
      if (!ctx.interactive || exp.waitTimer <= 0) choose(ctx, autopilotChoice(ctx, exp.map[exp.layer]));
      break;
    case 'walk':
      tickRobotField(ctx, dt);
      exp.timer -= dt;
      if (exp.timer <= 0) arrive(ctx);
      break;
    case 'node':
      tickRobotField(ctx, dt);
      exp.timer -= dt;
      if (exp.timer <= 0) finishTimedNode(ctx);
      break;
    case 'event': {
      exp.waitTimer -= dt;
      if (!ctx.interactive || exp.waitTimer <= 0) eventChoice(ctx, eventById(currentNode(exp).eventId!).safe);
      break;
    }
    case 'fight': {
      const res = tickFight(ctx, exp.fight!, dt);
      if (res === 'won') winFight(ctx);
      else if (res === 'lost') loseFight(ctx);
      break;
    }
    case 'return':
      if (!exp.broken) tickRobotField(ctx, dt);
      exp.timer -= dt;
      if (exp.timer <= 0) deposit(ctx);
      break;
  }
}

export { currentNode };
